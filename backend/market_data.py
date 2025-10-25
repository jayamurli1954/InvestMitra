import yfinance as yf
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import logging
import csv
from pathlib import Path

logger = logging.getLogger(__name__)

# Cache for all available NSE stocks (refreshed periodically)
_NSE_STOCKS_CACHE = None
_CACHE_TIMESTAMP = None
_SECTOR_CACHE = {}

def get_all_nse_stocks_dynamic():
    """
    Load all available NSE stocks from CSV file.
    CSV should be in the same directory as this script.
    Results are cached for 1 hour to avoid excessive file reads.
    """
    global _NSE_STOCKS_CACHE, _CACHE_TIMESTAMP
    
    from datetime import datetime, timedelta
    
    # Check if cache is still valid (refresh every 1 hour)
    if _NSE_STOCKS_CACHE is not None and _CACHE_TIMESTAMP is not None:
        if datetime.now() - _CACHE_TIMESTAMP < timedelta(hours=1):
            return _NSE_STOCKS_CACHE
    
    logger.info("Loading NSE stocks from CSV file...")
    
    stocks_dict = {}
    csv_file_path = Path(__file__).parent / "nse_stocks_with_sectors.csv"
    
    try:
        if csv_file_path.exists():
            with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    symbol = row.get('symbol', '').strip()
                    name = row.get('name', '').strip()
                    if symbol and name:
                        stocks_dict[symbol] = name
            logger.info(f"✓ Loaded {len(stocks_dict)} stocks from CSV file")
        else:
            logger.warning(f"CSV file not found at {csv_file_path}. Using fallback list.")
            # Fallback to basic stocks if CSV not found
            stocks_dict = {
                "RELIANCE.NS": "Reliance Industries",
                "TCS.NS": "Tata Consultancy Services",
                "HDFCBANK.NS": "HDFC Bank",
                "INFY.NS": "Infosys",
                "ICICIBANK.NS": "ICICI Bank",
            }
    except Exception as e:
        logger.error(f"Error reading CSV file: {str(e)}")
        stocks_dict = {}
    
    # Cache the results
    _NSE_STOCKS_CACHE = stocks_dict
    _CACHE_TIMESTAMP = datetime.now()
    
    return stocks_dict


def get_stock_sector_from_csv(symbol: str) -> str:
    """
    Get sector information for a stock from CSV file.
    Caches results to avoid repeated file reads.
    
    Args:
        symbol: Stock symbol (e.g., 'RELIANCE.NS')
        
    Returns:
        Sector name or 'Other' if not found
    """
    global _SECTOR_CACHE
    
    # Check cache first
    if symbol in _SECTOR_CACHE:
        return _SECTOR_CACHE[symbol]
    
    csv_file_path = Path(__file__).parent / "nse_stocks_with_sectors.csv"
    
    try:
        if csv_file_path.exists():
            with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    if row.get('symbol', '').strip() == symbol:
                        sector = row.get('sector', 'Other').strip()
                        # Cache it
                        _SECTOR_CACHE[symbol] = sector if sector else 'Other'
                        return _SECTOR_CACHE[symbol]
    except Exception as e:
        logger.error(f"Error reading sector from CSV: {str(e)}")
    
    # Default to 'Other' if not found
    _SECTOR_CACHE[symbol] = 'Other'
    return 'Other'


MARKET_INDICES = {
    "^NSEI": "NIFTY 50",
    "^BSESN": "SENSEX",
    "^NSEBANK": "NIFTY Bank",
}

def get_stock_info(symbol: str) -> Optional[Dict]:
    """Fetch real-time stock information from Yahoo Finance"""
    # Manual data for stocks where Yahoo Finance fails
    MANUAL_DATA = {
        "INDIGRID.NS": {
            "current_price": 169.00,
            "prev_close": 170.50,
            "volume": 150000,
            "market_cap": 1406230000000,
            "week_52_high": 173.79,
            "week_52_low": 137.00
        },
        "IRBINVIT.NS": {
            "current_price": 63.01,
            "prev_close": 63.50,
            "volume": 200000,
            "market_cap": 368000000000,
            "week_52_high": 70.00,
            "week_52_low": 55.00
        }
    }
    
    # Check manual data first
    if symbol in MANUAL_DATA:
        logger.info(f"Using manual data for {symbol}")
        return MANUAL_DATA[symbol]
    
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="5d")
        info = ticker.info
        
        if hist.empty:
            logger.warning(f"No data available for {symbol}")
            return None
        
        current_price = hist['Close'].iloc[-1]
        prev_close = ticker.info.get('previousClose', current_price)
        change = current_price - prev_close
        change_percent = (change / prev_close) * 100 if prev_close else 0
        
        # Get sector from CSV
        sector = get_stock_sector_from_csv(symbol)
        
        return {
            "symbol": symbol,
            "name": get_all_nse_stocks_dynamic().get(symbol, info.get('longName', symbol)),
            "exchange": "NSE",
            "sector": sector,
            "current_price": float(current_price),
            "change": float(change),
            "change_percent": float(change_percent),
            "volume": int(info.get('volume', hist['Volume'].iloc[-1])),
            "market_cap": float(info.get('marketCap', 0)),
            "pe_ratio": float(info.get('trailingPE', 0)) if info.get('trailingPE') else None,
            "pb_ratio": float(info.get('priceToBook', 0)) if info.get('priceToBook') else None,
            "roe": float(info.get('returnOnEquity', 0) * 100) if info.get('returnOnEquity') else None,
            "debt_to_equity": float(info.get('debtToEquity', 0) / 100) if info.get('debtToEquity') else None,
            "dividend_yield": float(info.get('dividendYield', 0) * 100) if info.get('dividendYield') else None,
            "week_52_high": float(info.get('fiftyTwoWeekHigh', current_price)),
            "week_52_low": float(info.get('fiftyTwoWeekLow', current_price)),
            "rsi": None,
            "ma_50": float(info.get('fiftyDayAverage', current_price)),
            "ma_200": float(info.get('twoHundredDayAverage', current_price)),
        }
    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {str(e)}")
        return None

def get_historical_data(symbol: str, days: int = 90) -> List[Dict]:
    """Fetch historical stock data"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=f"{days}d")
        
        data = []
        for date, row in hist.iterrows():
            data.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume'])
            })
        
        return data
    except Exception as e:
        logger.error(f"Error fetching historical data for {symbol}: {str(e)}")
        return []

def get_market_indices() -> List[Dict]:
    """Fetch market indices data"""
    indices_data = []
    
    for symbol, name in MARKET_INDICES.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="1d")
            
            if not hist.empty:
                current_price = hist['Close'].iloc[-1]
                prev_close = ticker.info.get('previousClose', current_price)
                change = current_price - prev_close
                change_percent = (change / prev_close) * 100 if prev_close else 0
                
                indices_data.append({
                    "name": name,
                    "value": float(current_price),
                    "change": float(change),
                    "change_percent": float(change_percent)
                })
        except Exception as e:
            logger.error(f"Error fetching {name}: {str(e)}")
    
    return indices_data

def get_all_stocks_basic() -> List[Dict]:
    """Get basic info for all available stocks from CSV"""
    stocks = []
    
    for symbol, name in get_all_nse_stocks_dynamic().items():
        sector = get_stock_sector_from_csv(symbol)
        stocks.append({
            "symbol": symbol,
            "name": name,
            "exchange": "NSE",
            "sector": sector
        })
    
    return stocks

def get_current_price(symbol: str) -> float:
    """Get current price for a stock"""
    # Manual price overrides for stocks where Yahoo Finance fails
    MANUAL_PRICES = {
        "INDIGRID.NS": 169.00,
        "IRBINVIT.NS": 63.01,
    }
    
    # Check manual override first
    if symbol in MANUAL_PRICES:
        logger.info(f"Using manual price for {symbol}: {MANUAL_PRICES[symbol]}")
        return MANUAL_PRICES[symbol]
    
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1d")
        if not hist.empty:
            return float(hist['Close'].iloc[-1])
    except Exception as e:
        logger.error(f"Error fetching price for {symbol}: {str(e)}")
    return 0.0
