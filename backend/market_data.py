import yfinance as yf
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# Indian stock symbols mapping - Top 50+ NSE/BSE stocks
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
}

MARKET_INDICES = {
    "^NSEI": "NIFTY 50",
    "^BSESN": "SENSEX",
    "^NSEBANK": "NIFTY Bank",
}

def get_stock_info(symbol: str) -> Optional[Dict]:
    """Fetch real-time stock information from Yahoo Finance"""
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
            "JSWSTEEL.NS": "Metals & Mining", "NESTLEIND.NS": "FMCG"
        }
        
        return {
            "symbol": symbol,
            "name": INDIAN_STOCKS.get(symbol, info.get('longName', symbol)),
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
        "ONGC.NS": "Energy", "M&M.NS": "Automobile"
    }
    
    for symbol, name in INDIAN_STOCKS.items():
        stocks.append({
            "symbol": symbol,
            "name": name,
            "exchange": "NSE",
            "sector": sector_map.get(symbol, "Other")
        })
    return stocks

def get_current_price(symbol: str) -> float:
    """Get current price for a stock"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1d")
        if not hist.empty:
            return float(hist['Close'].iloc[-1])
    except Exception as e:
        logger.error(f"Error fetching price for {symbol}: {str(e)}")
    return 0.0
