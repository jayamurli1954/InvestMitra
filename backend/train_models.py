import asyncio
import os
import sys
import logging
import yfinance as yf
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Import ML models
from ml_models.risk_model import calculate_risk_score
from ml_models.rating_model import calculate_ai_rating
from ml_models.monte_carlo import monte_carlo_simulation

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv(".env")
load_dotenv(".env.local")
load_dotenv(".env.example")

# Clean any quotes off the URL
fallback_url = "mongodb+srv://jayamurli1954:gs4MO878TN0HWFg0@cluster0.48as0iv.mongodb.net/investment_framework?retryWrites=true&w=majority&appName=Cluster0"
MONGO_URL = os.environ.get("MONGO_URL", fallback_url).strip('"').strip("'")
DB_NAME = os.environ.get("DB_NAME", "investment_framework")

DEFAULT_STOCKS = ["TCS.NS", "INFY.NS", "HDFCBANK.NS", "RELIANCE.NS"]

async def fetch_tracked_symbols(db) -> set:
    """Fetch all unique stock symbols currently held in user portfolios."""
    cursor = db.portfolio.find({"asset_type": {"$in": ["STOCK", None]}, "symbol": {"$exists": True, "$ne": None}})
    symbols = set(DEFAULT_STOCKS)
    async for holding in cursor:
        sym = holding.get("symbol")
        if sym and isinstance(sym, str):
            symbols.add(sym.upper())
    return symbols

async def process_stock(symbol: str, db):
    """Fetch historical data and run ML predictions for a single stock."""
    logger.info(f"Processing {symbol}...")
    try:
        # Run blocking yfinance call in a thread to avoid freezing asyncio loop
        df = await asyncio.to_thread(yf.download, symbol, period="1y", interval="1d", progress=False)
        
        if df.empty:
            logger.warning(f"No data returned from yfinance for {symbol}.")
            return None
            
        # Clean multi-index columns from yfinance (a common issue in modern yfinance versions)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
            
        df = df.reset_index()
            
        # Ensure column map translates correctly
        df.columns = [str(c).lower().strip() for c in df.columns]
        
        if "close" not in df.columns and "adj close" in df.columns:
            df["close"] = df["adj close"]
        elif "close" not in df.columns:
            logger.warning(f"Missing 'close' price data for {symbol}. Found columns: {df.columns.tolist()}")
            return None
            
        df["returns"] = df["close"].pct_change()
        
        # 1. Risk Score
        risk_score = calculate_risk_score(df)
        
        # 2. Rating Model Inputs
        # Momentum Score (Roughly -10 to +10 normalized to 0-10)
        num_rows = len(df)
        if num_rows >= 30:
            momentum_raw = (df["close"].iloc[-1] / df["close"].iloc[-30]) - 1
        elif num_rows > 1:
            momentum_raw = (df["close"].iloc[-1] / df["close"].iloc[0]) - 1
        else:
            momentum_raw = 0.0
            
        # A 20% gain in 30 days = +0.20 -> *20 = +4.0 -> +5 = 9.0 Rating
        momentum = float(min(max((momentum_raw * 20) + 5, 0.0), 10.0))
        
        # Volatility Score
        vol_series = df["returns"].rolling(20).std()
        if not vol_series.isna().all():
            volatility_raw = vol_series.dropna().iloc[-1] * np.sqrt(252)
        else:
            volatility_raw = 0.0
        # A 30% volatility = 0.3 * 10 = 3 out of 10
        volatility = float(min(volatility_raw * 10, 10.0))
            
        # Drawdown
        cummax = df["close"].cummax()
        drawdown_pct = (df["close"] / cummax - 1).min()
        drawdown_impact = float(abs(drawdown_pct) * 10)
        
        # Trend (MA crossover map 0-10)
        if num_rows >= 20:
            ma5 = df["close"].rolling(5).mean().iloc[-1]
            ma20 = df["close"].rolling(20).mean().iloc[-1]
            trend = 8.0 if ma5 > ma20 else 4.0
        else:
            trend = 5.0
            
        # Relative Strength (vs Nifty roughly)
        rs = 5.0 # default placeholder
        
        ai_rating = calculate_ai_rating(
            momentum=momentum,
            volatility=volatility,
            drawdown=drawdown_impact,
            trend=trend,
            relative_strength=rs
        )
        
        # 3. Monte Carlo Simulation
        monte_carlo = monte_carlo_simulation(df["returns"].dropna())
        
        # Build Document
        document = {
            "symbol": symbol,
            "risk_score": risk_score,
            "ai_rating": ai_rating,
            "monte_carlo": monte_carlo,
            "trend_signal": "Bullish" if trend > 5 else "Bearish",
            "confidence": 70, # static placeholder for now
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if db is not None:
            # Save to DB
            await db.ml_predictions.update_one(
                {"symbol": symbol},
                {"$set": document},
                upsert=True
            )
            logger.info(f"Successfully saved ML predictions for {symbol}: AI Rating {ai_rating}, Risk {risk_score}")
        else:
            logger.info(f"[DRY RUN] {symbol} | Risk: {risk_score} | Rating: {ai_rating} | Trend: {document['trend_signal']}")
            logger.info(f"   -> Monte Carlo: Expected {monte_carlo['expected_return']*100:.2f}% | Worst Case 5%: {monte_carlo['worst_case_5pct']*100:.2f}%")
        
    except Exception as e:
        logger.error(f"Error processing {symbol}: {e}", exc_info=False)


async def run_training(dry_run=False):
    """Main execution function for nightly back-end training."""
    db = None
    symbols_to_process = set(DEFAULT_STOCKS)
    
    if not dry_run:
        logger.info("Connecting to MongoDB...")
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Ensure index exists for fast lookup
        await db.ml_predictions.create_index([("symbol", 1)], unique=True)
        
        db_symbols = await fetch_tracked_symbols(db)
        symbols_to_process.update(db_symbols)
    else:
        logger.info("Starting in DRY RUN mode. No database connection will be made.")
        
    logger.info(f"Found {len(symbols_to_process)} tracked symbols to process.")
    
    for idx, symbol in enumerate(symbols_to_process):
        # Format suffix appropriately if missing (this is mostly required for Indian stocks on Yahoo)
        lookup_symbol = symbol
        if "." not in lookup_symbol and lookup_symbol not in ["SENSEX", "NIFTY"]:
            lookup_symbol = f"{lookup_symbol}.NS"
            
        await process_stock(lookup_symbol, db)
        
        # Small delay to avoid rate-limiting from Yahoo Finance
        if idx < len(symbols_to_process) - 1:
            await asyncio.sleep(1.0)
            
    logger.info("Nightly ML training batch completed successfully.")
    # Client will naturally drop when process exits

if __name__ == "__main__":
    is_dry_run = "--dry-run" in sys.argv
    asyncio.run(run_training(dry_run=is_dry_run))
