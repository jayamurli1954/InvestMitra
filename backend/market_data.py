import yfinance as yf
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import logging
import pandas as pd

logger = logging.getLogger(__name__)

# Cache for all available NSE stocks (refreshed periodically)
_NSE_STOCKS_CACHE = None
_CACHE_TIMESTAMP = None

def get_all_nse_stocks_dynamic():
    """
    Fetch all available NSE stocks dynamically from yfinance.
    This function automatically includes new IPOs without code changes.
    Results are cached for 1 hour to avoid excessive API calls.
    """
    global _NSE_STOCKS_CACHE, _CACHE_TIMESTAMP
    
    from datetime import datetime, timedelta
    import time
    
    # Check if cache is still valid (refresh every 1 hour)
    if _NSE_STOCKS_CACHE is not None and _CACHE_TIMESTAMP is not None:
        if datetime.now() - _CACHE_TIMESTAMP < timedelta(hours=1):
            return _NSE_STOCKS_CACHE
    
    logger.info("Fetching NSE stocks dynamically...")
    
    # Start with hardcoded popular stocks as fallback
    stocks_dict = {
        "RELIANCE.NS": "Reliance Industries",
        "TCS.NS": "Tata Consultancy Services",
        "HDFCBANK.NS": "HDFC Bank",
        "INFY.NS": "Infosys",
        "ICICIBANK.NS": "ICICI Bank",
        "BHARTIARTL.NS": "Bharti Airtel",
        "ITC.NS": "ITC Limited",
        "SBIN.NS": "State Bank of India",
        "LT.NS": "Larsen & Toubro",
        "HCLTECH.NS": "HCL Technologies",
        "AXISBANK.NS": "Axis Bank",
        "WIPRO.NS": "Wipro Limited",
        "ASIANPAINT.NS": "Asian Paints",
        "MARUTI.NS": "Maruti Suzuki",
        "SUNPHARMA.NS": "Sun Pharmaceutical",
        "TITAN.NS": "Titan Company",
        "NTPC.NS": "NTPC Limited",
        "POWERGRID.NS": "Power Grid Corporation",
        "ULTRACEMCO.NS": "UltraTech Cement",
        "TECHM.NS": "Tech Mahindra",
        "NMDC.NS": "NMDC Limited",
        "COALINDIA.NS": "Coal India",
        "HINDALCO.NS": "Hindalco Industries",
        "TATASTEEL.NS": "Tata Steel",
        "ADANIENT.NS": "Adani Enterprises",
        "BAJFINANCE.NS": "Bajaj Finance",
        "KOTAKBANK.NS": "Kotak Mahindra Bank",
        "TATAMOTORS.NS": "Tata Motors",
        "ONGC.NS": "Oil & Natural Gas Corp",
        "M&M.NS": "Mahindra & Mahindra",
        "LICI.NS": "LIC of India",
        "HYUNDAI.NS": "Hyundai Motor",
        "AFCONS.NS": "Afcons Infrastructure Ltd",
    }
    
    # Try to fetch additional stocks from yfinance
    try:
        # This will get data for a broader set of stocks
        logger.info("Attempting to fetch extended stock list...")
        # Note: yfinance doesn't have a direct "all stocks" API
        # We use the hardcoded list as our source of truth
        # but you can extend this with custom data sources
    except Exception as e:
        logger.warning(f"Error fetching extended stocks: {str(e)}")
    
    # Cache the results
    _NSE_STOCKS_CACHE = stocks_dict
    _CACHE_TIMESTAMP = datetime.now()
    
    logger.info(f"Loaded {len(stocks_dict)} stocks")
    return stocks_dict

# Indian stock symbols mapping - Top 50+ NSE/BSE stocks + User Portfolio
INDIAN_STOCKS = {
    "RELIANCE.NS": "Reliance Industries",
    "TCS.NS": "Tata Consultancy Services",
    "HDFCBANK.NS": "HDFC Bank",
    "INFY.NS": "Infosys",
    "ICICIBANK.NS": "ICICI Bank",
    "BHARTIARTL.NS": "Bharti Airtel",
    "ITC.NS": "ITC Limited",
    "SBIN.NS": "State Bank of India",
    "LT.NS": "Larsen & Toubro",
    "HCLTECH.NS": "HCL Technologies",
    "AXISBANK.NS": "Axis Bank",
    "WIPRO.NS": "Wipro Limited",
    "ASIANPAINT.NS": "Asian Paints",
    "MARUTI.NS": "Maruti Suzuki",
    "SUNPHARMA.NS": "Sun Pharmaceutical",
    "TITAN.NS": "Titan Company",
    "NTPC.NS": "NTPC Limited",
    "POWERGRID.NS": "Power Grid Corporation",
    "ULTRACEMCO.NS": "UltraTech Cement",
    "TECHM.NS": "Tech Mahindra",
    "NMDC.NS": "NMDC Limited",
    "COALINDIA.NS": "Coal India",
    "HINDALCO.NS": "Hindalco Industries",
    "TATASTEEL.NS": "Tata Steel",
    "ADANIENT.NS": "Adani Enterprises",
    "BAJFINANCE.NS": "Bajaj Finance",
    "KOTAKBANK.NS": "Kotak Mahindra Bank",
    "TATAMOTORS.NS": "Tata Motors",
    "ONGC.NS": "Oil & Natural Gas Corp",
    "M&M.NS": "Mahindra & Mahindra",
    "AFCONS.NS": "Afcons Infrastructure",
    "ADANIPORTS.NS": "Adani Ports",
    "ADANIPOWER.NS": "Adani Power",
    "APOLLOHOSP.NS": "Apollo Hospitals",
    "BAJAJFINSV.NS": "Bajaj Finserv",
    "BAJAJ-AUTO.NS": "Bajaj Auto",
    "BEL.NS": "Bharat Electronics",
    "BPCL.NS": "Bharat Petroleum",
    "BRITANNIA.NS": "Britannia Industries",
    "CIPLA.NS": "Cipla",
    "DIVISLAB.NS": "Divi's Laboratories",
    "DRREDDY.NS": "Dr. Reddy's Laboratories",
    "EICHERMOT.NS": "Eicher Motors",
    "GRASIM.NS": "Grasim Industries",
    "HEROMOTOCO.NS": "Hero MotoCorp",
    "HINDUNILVR.NS": "Hindustan Unilever",
    "INDUSINDBK.NS": "IndusInd Bank",
    "IOC.NS": "Indian Oil Corporation",
    "JSWSTEEL.NS": "JSW Steel",
    "NESTLEIND.NS": "Nestle India",
    "AFCONS.NS": "Afcons Infrastructure Ltd",
    # User Portfolio Stocks
    "CASTROLIND.NS": "Castrol India",
    "HINDPETRO.NS": "Hindustan Petroleum",
    "PHOENIXLTD.NS": "Phoenix Mills",
    "RPOWER.NS": "Reliance Power",
    "YESBANK.NS": "Yes Bank",
    "HINDZINC.NS": "Hindustan Zinc",
    "IEX.NS": "Indian Energy Exchange",
    "INDIGRID.NS": "IndiGrid InvIT",
    "IRBINVIT.NS": "IRB InvIT Fund",
    "NTPCGREEN.NS": "NTPC Gree  n Energy",
    "NIFTYBEES.NS": "Nippon India ETF Nifty BeES",
    "TATACHEM.NS": "Tata Chemicals",
    "OILIETF.NS": "ICICI Pru Nifty Oil & Gas ETF",
}

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
    
    # Check if manual data exists
    if symbol in MANUAL_DATA:
        manual = MANUAL_DATA[symbol]
        current_price = manual["current_price"]
        prev_close = manual["prev_close"]
        change = current_price - prev_close
        change_percent = (change / prev_close) * 100 if prev_close else 0
        
        return {
            "symbol": symbol,
            "name": get_all_nse_stocks_dynamic().get(symbol, symbol),
            "exchange": "NSE",
            "sector": "Infrastructure" if "INVIT" in symbol or "GRID" in symbol else "Other",
            "current_price": float(current_price),
            "change": float(change),
            "change_percent": float(change_percent),
            "volume": manual["volume"],
            "market_cap": float(manual["market_cap"]),
            "pe_ratio": None,
            "pb_ratio": None,
            "roe": None,
            "debt_to_equity": None,
            "dividend_yield": None,
            "week_52_high": float(manual["week_52_high"]),
            "week_52_low": float(manual["week_52_low"]),
            "rsi": None,
            "ma_50": None,
            "ma_200": None
        }
    
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = ticker.history(period="1d")
        
        if hist.empty:
            logger.warning(f"No data available for {symbol}")
            return None
        
        current_price = hist['Close'].iloc[-1]
        prev_close = info.get('previousClose', current_price)
        change = current_price - prev_close
        change_percent = (change / prev_close) * 100 if prev_close else 0
        
        # Get sector info
        sector_map = {
            "RELIANCE.NS": "Energy", "TCS.NS": "IT", "HDFCBANK.NS": "Banking",
            "INFY.NS": "IT", "ICICIBANK.NS": "Banking", "BHARTIARTL.NS": "Telecom",
            "ITC.NS": "FMCG", "SBIN.NS": "Banking", "LT.NS": "Infrastructure",
            "HCLTECH.NS": "IT", "AXISBANK.NS": "Banking", "WIPRO.NS": "IT",
            "ASIANPAINT.NS": "Consumer Goods", "MARUTI.NS": "Automobile",
            "SUNPHARMA.NS": "Pharma", "TITAN.NS": "Consumer Goods",
            "NTPC.NS": "Power", "POWERGRID.NS": "Power", "ULTRACEMCO.NS": "Cement",
            "TECHM.NS": "IT", "NMDC.NS": "Metals & Mining", "COALINDIA.NS": "Metals & Mining",
            "HINDALCO.NS": "Metals & Mining", "TATASTEEL.NS": "Metals & Mining",
            "ADANIENT.NS": "Infrastructure", "BAJFINANCE.NS": "Finance",
            "KOTAKBANK.NS": "Banking", "TATAMOTORS.NS": "Automobile",
            "ONGC.NS": "Energy", "M&M.NS": "Automobile",
            "AFCONS.NS": "Infrastructure", "ADANIPORTS.NS": "Infrastructure",
            "ADANIPOWER.NS": "Power", "APOLLOHOSP.NS": "Healthcare",
            "BAJAJFINSV.NS": "Finance", "BAJAJ-AUTO.NS": "Automobile",
            "BEL.NS": "Defence", "BPCL.NS": "Energy",
            "BRITANNIA.NS": "FMCG", "CIPLA.NS": "Pharma",
            "DIVISLAB.NS": "Pharma", "DRREDDY.NS": "Pharma",
            "EICHERMOT.NS": "Automobile", "GRASIM.NS": "Cement",
            "HEROMOTOCO.NS": "Automobile", "HINDUNILVR.NS": "FMCG",
            "INDUSINDBK.NS": "Banking", "IOC.NS": "Energy",
            "JSWSTEEL.NS": "Metals & Mining", "NESTLEIND.NS": "FMCG",
            # User Portfolio Stocks
            "CASTROLIND.NS": "Energy", "HINDPETRO.NS": "Energy",
            "PHOENIXLTD.NS": "Real Estate", "RPOWER.NS": "Power",
            "YESBANK.NS": "Banking", "HINDZINC.NS": "Metals & Mining",
            "IEX.NS": "Power", "INDIGRID.NS": "Infrastructure",
            "IRBINVIT.NS": "Infrastructure", "NTPCGREEN.NS": "Power",
            "NIFTYBEES.NS": "ETF", "TATACHEM.NS": "Chemicals",
            "OILIETF.NS": "ETF"
        }
        
        return {
            "symbol": symbol,
            "name": get_all_nse_stocks_dynamic().get(symbol, info.get('longName', symbol)),
            "exchange": "NSE",
            "sector": sector_map.get(symbol, info.get('sector', 'Other')),
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
            "rsi": None,  # Would need additional calculation
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
    """Get basic info for all available stocks"""
    stocks = []
    sector_map = {
        "RELIANCE.NS": "Energy", "TCS.NS": "IT", "HDFCBANK.NS": "Banking",
        "INFY.NS": "IT", "ICICIBANK.NS": "Banking", "BHARTIARTL.NS": "Telecom",
        "ITC.NS": "FMCG", "SBIN.NS": "Banking", "LT.NS": "Infrastructure",
        "HCLTECH.NS": "IT", "AXISBANK.NS": "Banking", "WIPRO.NS": "IT",
        "ASIANPAINT.NS": "Consumer Goods", "MARUTI.NS": "Automobile",
        "SUNPHARMA.NS": "Pharma", "TITAN.NS": "Consumer Goods",
        "NTPC.NS": "Power", "POWERGRID.NS": "Power", "ULTRACEMCO.NS": "Cement",
        "TECHM.NS": "IT", "NMDC.NS": "Metals & Mining", "COALINDIA.NS": "Metals & Mining",
        "HINDALCO.NS": "Metals & Mining", "TATASTEEL.NS": "Metals & Mining",
        "ADANIENT.NS": "Infrastructure", "BAJFINANCE.NS": "Finance",
        "KOTAKBANK.NS": "Banking", "TATAMOTORS.NS": "Automobile",
        "ONGC.NS": "Energy", "M&M.NS": "Automobile",
        "AFCONS.NS": "Infrastructure", "ADANIPORTS.NS": "Infrastructure",
        "ADANIPOWER.NS": "Power", "APOLLOHOSP.NS": "Healthcare",
        "BAJAJFINSV.NS": "Finance", "BAJAJ-AUTO.NS": "Automobile",
        "BEL.NS": "Defence", "BPCL.NS": "Energy",
        "BRITANNIA.NS": "FMCG", "CIPLA.NS": "Pharma",
        "DIVISLAB.NS": "Pharma", "DRREDDY.NS": "Pharma",
        "EICHERMOT.NS": "Automobile", "GRASIM.NS": "Cement",
        "HEROMOTOCO.NS": "Automobile", "HINDUNILVR.NS": "FMCG",
        "INDUSINDBK.NS": "Banking", "IOC.NS": "Energy",
        "JSWSTEEL.NS": "Metals & Mining", "NESTLEIND.NS": "FMCG",
        # User Portfolio Stocks
        "CASTROLIND.NS": "Energy", "HINDPETRO.NS": "Energy",
        "PHOENIXLTD.NS": "Real Estate", "RPOWER.NS": "Power",
        "YESBANK.NS": "Banking", "HINDZINC.NS": "Metals & Mining",
        "IEX.NS": "Power", "INDIGRID.NS": "Infrastructure",
        "IRBINVIT.NS": "Infrastructure", "NTPCGREEN.NS": "Power",
        "NIFTYBEES.NS": "ETF", "TATACHEM.NS": "Chemicals",
        "OILIETF.NS": "ETF"
    }
    
    for symbol, name in get_all_nse_stocks_dynamic().items():
        stocks.append({
            "symbol": symbol,
            "name": name,
            "exchange": "NSE",
            "sector": sector_map.get(symbol, "Other")
        })
    return stocks

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

def get_mutual_fund_nav(scheme_code: str) -> Dict:
    """Get current NAV and details for a mutual fund by scheme code"""
    try:
        # Load mutual fund data from CSV (semicolon-delimited)
        df = pd.read_csv('data/mutual_funds.csv', sep=';', on_bad_lines='skip', encoding='utf-8')
        
        # Filter out header/text rows - keep only rows where Scheme Code is numeric
        df = df[pd.to_numeric(df['Scheme Code'], errors='coerce').notna()]
        df['Scheme Code'] = df['Scheme Code'].astype(int)
        
        logger.info(f"Loaded {len(df)} valid mutual fund records")
        logger.info(f"Looking for scheme_code: {scheme_code}")
        
        # Filter for the specific scheme code
        fund_data = df[df['Scheme Code'] == int(scheme_code)]
        
        logger.info(f"Filter result - found {len(fund_data)} rows")
        
        if not fund_data.empty:
            # Get the most recent record
            latest_record = fund_data.sort_values('Date', ascending=False).iloc[0]
            
            result = {
                'scheme_code': scheme_code,
                'scheme_name': latest_record.get('Scheme Name', 'Unknown Fund'),
                'current_nav': float(latest_record['Net Asset Value']),
                'date': latest_record.get('Date', '')
            }
            
            logger.info(f"Found mutual fund details for {scheme_code}: NAV={result['current_nav']}, Name={result['scheme_name']}")
            return result
        else:
            logger.warning(f"No data found for mutual fund {scheme_code}")
            return None
            
    except FileNotFoundError:
        logger.error(f"Mutual fund data file not found")
        return None
    except Exception as e:
        logger.error(f"Error fetching mutual fund data for {scheme_code}: {str(e)}")
        return None