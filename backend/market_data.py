import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import logging
import asyncio
from typing import Optional, Dict, List
from websocket_manager import manager

logger = logging.getLogger(__name__)



def get_stock_info(symbols: any) -> Dict[str, Dict]:
    """Fetch real-time stock information for a single symbol or a batch of stock symbols."""
    if isinstance(symbols, str):
        symbols = [symbols]

    results = {}

    if not symbols:
        return results

    try:
        tickers = yf.Tickers(' '.join(symbols))
        
        for symbol in symbols:
            try:
                info = tickers.tickers[symbol].info
                hist = tickers.tickers[symbol].history(period="1d")

                if hist.empty:
                    logger.warning(f"No data available for {symbol}")
                    continue

                current_price = hist['Close'].iloc[-1]
                prev_close = info.get('previousClose', current_price)
                change = current_price - prev_close
                change_percent = (change / prev_close) * 100 if prev_close else 0

                results[symbol] = {
                    "symbol": symbol,
                    "name": info.get('longName', symbol),
                    "exchange": info.get('exchange', 'N/A'),
                    "sector": info.get('sector', 'Other'),
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
                logger.error(f"Error processing symbol {symbol} in batch: {str(e)}")

    except Exception as e:
        logger.error(f"Error fetching batch data for symbols {symbols}: {str(e)}")
        
    return results



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

MARKET_INDICES = {
    "^NSEI": "NIFTY 50",
    "^BSESN": "SENSEX",
    "^NSEBANK": "NIFTY Bank",
    "^DJI": "Dow Jones",
    "^IXIC": "NASDAQ",
    "^FTSE": "FTSE 100",
    "^STI": "STI"
}

def get_major_world_stocks() -> List[Dict]:
    """Fetch data for major world stocks."""
    major_stocks = {
        "RELIANCE.NS": "Reliance",
        "TCS.NS": "TCS",
        "HDFCBANK.NS": "HDFC Bank",
        "INFY.NS": "Infosys",
        "AAPL": "Apple",
        "GOOGL": "Google",
        "MSFT": "Microsoft",
        "AMZN": "Amazon",
        "TSLA": "Tesla",
        "HSBC": "HSBC",
        "VOD": "Vodafone",
        "TM": "Toyota",
        "SONY": "Sony",
    }

    stocks_data = []
    for symbol, name in major_stocks.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="1d")
            
            if not hist.empty:
                current_price = hist['Close'].iloc[-1]
                prev_close = ticker.info.get('previousClose', current_price)
                change = current_price - prev_close
                change_percent = (change / prev_close) * 100 if prev_close else 0
                
                stocks_data.append({
                    "symbol": symbol,
                    "name": name,
                    "value": float(current_price),
                    "change": float(change),
                    "change_percent": float(change_percent)
                })
        except Exception as e:
            logger.error(f"Error fetching {name}: {str(e)}")
    
    return stocks_data

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



def get_current_price(symbol: str) -> float:
    """Get current price for a stock"""
    # Manual price overrides for stocks where Yahoo Finance fails (InvITs, some ETFs)
    MANUAL_PRICES = {
        "INDIGRID.NS": 169.00,  # IndiGrid InvIT - manually updated
        "IRBINVIT.NS": 63.01,   # IRB InvIT - manually updated
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

_MUTUAL_FUNDS_CACHE = None

def load_mutual_fund_data():
    """Load mutual fund data from CSV into a cache."""
    global _MUTUAL_FUNDS_CACHE
    try:
        df = pd.read_csv('data/mutual_funds.csv', sep=';', on_bad_lines='skip', encoding='utf-8')
        df = df[pd.to_numeric(df['Scheme Code'], errors='coerce').notna()]
        df['Scheme Code'] = df['Scheme Code'].astype(int)
        _MUTUAL_FUNDS_CACHE = df.set_index('Scheme Code')
        logger.info(f"Loaded {len(_MUTUAL_FUNDS_CACHE)} valid mutual fund records into cache.")
    except FileNotFoundError:
        logger.error("Mutual fund data file not found: data/mutual_funds.csv")
        _MUTUAL_FUNDS_CACHE = pd.DataFrame()
    except Exception as e:
        logger.error(f"Error loading mutual fund data: {str(e)}")
        _MUTUAL_FUNDS_CACHE = pd.DataFrame()

# Load the mutual fund data on startup
load_mutual_fund_data()

def get_exchange_rate(base_currency: str, target_currency: str) -> Optional[float]:
    """Fetch the exchange rate between two currencies."""
    if base_currency == target_currency:
        return 1.0
    
    try:
        # Use yfinance to get the exchange rate
        ticker = f"{base_currency}{target_currency}=X"
        data = yf.Ticker(ticker).history(period="1d")
        if not data.empty:
            return data['Close'].iloc[-1]
        else:
            # Try the other way around
            ticker = f"{target_currency}{base_currency}=X"
            data = yf.Ticker(ticker).history(period="1d")
            if not data.empty:
                return 1.0 / data['Close'].iloc[-1]
    except Exception as e:
        logger.error(f"Error fetching exchange rate for {base_currency} to {target_currency}: {e}")
        return None

def get_mutual_fund_nav(scheme_code: str) -> Dict:
    """Get current NAV and details for a mutual fund by scheme code from cached data."""
    if _MUTUAL_FUNDS_CACHE is None or _MUTUAL_FUNDS_CACHE.empty:
        logger.warning("Mutual fund data is not loaded. Cannot fetch NAV.")
        return None

    try:
        scheme_code_int = int(scheme_code)
        if scheme_code_int in _MUTUAL_FUNDS_CACHE.index:
            fund_data = _MUTUAL_FUNDS_CACHE.loc[[scheme_code_int]]
            latest_record = fund_data.sort_values('Date', ascending=False).iloc[0]
            
            result = {
                'scheme_code': scheme_code,
                'scheme_name': latest_record.get('Scheme Name', 'Unknown Fund'),
                'current_nav': float(latest_record['Net Asset Value']),
                'date': latest_record.get('Date', '')
            }
            
            logger.debug(f"Found mutual fund details for {scheme_code}: NAV={result['current_nav']}")
            return result
        else:
            logger.warning(f"No data found for mutual fund {scheme_code}")
            return None
            
    except Exception as e:
        logger.error(f"Error fetching mutual fund data for {scheme_code}: {str(e)}")
        return None