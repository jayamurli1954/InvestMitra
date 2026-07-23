import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import logging
import asyncio
import os
import time
from typing import Optional, Dict, List, Any
from websocket_manager import manager

logger = logging.getLogger(__name__)

MARKET_CACHE_TTL_SECONDS = int(os.environ.get("MARKET_CACHE_TTL_SECONDS", "600"))
_INDICES_CACHE = {"data": [], "ts": 0.0}
_MAJOR_STOCKS_CACHE = {"data": [], "ts": 0.0}


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
                ticker = tickers.tickers[symbol]
                
                # Fetch history first (highly resilient)
                hist = ticker.history(period="5d")
                if hist.empty:
                    # Fallback to single ticker lookup
                    try:
                        t = yf.Ticker(symbol)
                        hist = t.history(period="5d")
                    except Exception:
                        pass
                
                if hist.empty:
                    logger.warning(f"No history data available for {symbol}")
                    continue

                current_price = float(hist['Close'].iloc[-1])
                prev_close = float(hist['Close'].iloc[-2]) if len(hist) > 1 else current_price
                
                # Safely attempt to fetch info (might fail on Render)
                info = {}
                try:
                    info = ticker.info
                    if not info or not isinstance(info, dict):
                        info = {}
                except Exception as info_err:
                    logger.warning(f"Info fetch failed for {symbol}: {info_err}")

                change = current_price - prev_close
                change_percent = (change / prev_close) * 100 if prev_close else 0

                results[symbol] = {
                    "symbol": symbol,
                    "name": info.get('longName') or info.get('shortName') or symbol,
                    "exchange": info.get('exchange', 'NSE'),
                    "sector": info.get('sector', 'Other'),
                    "current_price": float(current_price),
                    "change": float(change),
                    "change_percent": float(change_percent),
                    "volume": int(info.get('volume') or (hist['Volume'].iloc[-1] if 'Volume' in hist.columns else 0)),
                    "market_cap": float(info.get('marketCap', 0)) if info.get('marketCap') else 0.0,
                    "pe_ratio": float(info.get('trailingPE', 0)) if info.get('trailingPE') else None,
                    "pb_ratio": float(info.get('priceToBook', 0)) if info.get('priceToBook') else None,
                    "roe": float(info.get('returnOnEquity', 0) * 100) if info.get('returnOnEquity') else None,
                    "debt_to_equity": float(info.get('debtToEquity', 0) / 100) if info.get('debtToEquity') else None,
                    "dividend_yield": float(info.get('dividendYield', 0) * 100) if info.get('dividendYield') else None,
                    "week_52_high": float(info.get('fiftyTwoWeekHigh') or (current_price * 1.1)),
                    "week_52_low": float(info.get('fiftyTwoWeekLow') or (current_price * 0.9)),
                    "rsi": None,
                    "ma_50": float(info.get('fiftyDayAverage') or current_price),
                    "ma_200": float(info.get('twoHundredDayAverage') or current_price),
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

def _is_cache_fresh(cache_obj: Dict[str, any]) -> bool:
    return bool(cache_obj["data"]) and (time.time() - cache_obj["ts"] < MARKET_CACHE_TTL_SECONDS)

def _extract_close_prices(hist_df: pd.DataFrame, symbol: str):
    """
    Extract current and previous close from yfinance download result.
    Supports both single-symbol and multi-symbol dataframe layouts.
    """
    if hist_df is None or hist_df.empty:
        return None, None

    try:
        if isinstance(hist_df.columns, pd.MultiIndex):
            if symbol not in hist_df.columns.get_level_values(0):
                return None, None
            symbol_df = hist_df[symbol]
        else:
            symbol_df = hist_df

        if "Close" not in symbol_df.columns:
            return None, None

        closes = symbol_df["Close"].dropna()
        if closes.empty:
            return None, None

        current_price = float(closes.iloc[-1])
        prev_close = float(closes.iloc[-2]) if len(closes) > 1 else current_price
        return current_price, prev_close
    except Exception:
        return None, None

def get_batch_stock_prices(symbols: List[str]) -> Dict[str, Dict]:
    """Efficiently fetch just the current prices for a batch of symbols using yf.download."""
    results = {}
    if not symbols:
        return results
    try:
        hist = yf.download(
            tickers=" ".join(symbols),
            period="5d",
            interval="1d",
            group_by="ticker",
            auto_adjust=False,
            progress=False,
            threads=False,
        )
        for symbol in symbols:
            current_price, prev_close = _extract_close_prices(hist, symbol)
            if current_price is not None:
                results[symbol] = {"current_price": float(current_price)}
    except Exception as e:
        logger.error(f"Error fetching batch prices for {symbols}: {e}")
    return results

def _build_market_point(name: str, current_price: float, prev_close: float, symbol: Optional[str] = None) -> Dict:
    change = current_price - prev_close
    change_percent = (change / prev_close) * 100 if prev_close else 0
    payload = {
        "name": name,
        "value": float(current_price),
        "change": float(change),
        "change_percent": float(change_percent),
    }
    if symbol:
        payload["symbol"] = symbol
    return payload

def get_major_world_stocks() -> List[Dict]:
    """Fetch data for major world stocks."""
    if _is_cache_fresh(_MAJOR_STOCKS_CACHE):
        return _MAJOR_STOCKS_CACHE["data"]

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
    symbols = list(major_stocks.keys())
    try:
        hist = yf.download(
            tickers=" ".join(symbols),
            period="5d",
            interval="1d",
            group_by="ticker",
            auto_adjust=False,
            progress=False,
            threads=False,
        )
        for symbol, name in major_stocks.items():
            current_price, prev_close = _extract_close_prices(hist, symbol)
            if current_price is None:
                continue
            stocks_data.append(
                _build_market_point(name=name, current_price=current_price, prev_close=prev_close, symbol=symbol)
            )
    except Exception as e:
        logger.error(f"Error fetching major stocks batch: {str(e)}")

    if stocks_data:
        _MAJOR_STOCKS_CACHE["data"] = stocks_data
        _MAJOR_STOCKS_CACHE["ts"] = time.time()
        return stocks_data

    if _MAJOR_STOCKS_CACHE["data"]:
        logger.warning("Using stale major stocks cache due to upstream rate limit")
        return _MAJOR_STOCKS_CACHE["data"]

    # Initial fallback if no prior successful sample is available.
    return [
        {
            "symbol": symbol,
            "name": name,
            "value": 0.0,
            "change": 0.0,
            "change_percent": 0.0,
        }
        for symbol, name in major_stocks.items()
    ]

def get_market_indices() -> List[Dict]:
    """Fetch market indices data"""
    if _is_cache_fresh(_INDICES_CACHE):
        return _INDICES_CACHE["data"]

    indices_data = []
    symbols = list(MARKET_INDICES.keys())
    try:
        hist = yf.download(
            tickers=" ".join(symbols),
            period="5d",
            interval="1d",
            group_by="ticker",
            auto_adjust=False,
            progress=False,
            threads=False,
        )
        for symbol, name in MARKET_INDICES.items():
            current_price, prev_close = _extract_close_prices(hist, symbol)
            if current_price is None:
                continue
            indices_data.append(
                _build_market_point(name=name, current_price=current_price, prev_close=prev_close)
            )
    except Exception as e:
        logger.error(f"Error fetching market indices batch: {str(e)}")

    if indices_data:
        _INDICES_CACHE["data"] = indices_data
        _INDICES_CACHE["ts"] = time.time()
        return indices_data

    if _INDICES_CACHE["data"]:
        logger.warning("Using stale market indices cache due to upstream rate limit")
        return _INDICES_CACHE["data"]

    # Initial fallback if no prior successful sample is available.
    return [
        {
            "name": name,
            "value": 0.0,
            "change": 0.0,
            "change_percent": 0.0,
        }
        for _, name in MARKET_INDICES.items()
    ]



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
        from pathlib import Path
        base_dir = Path(__file__).parent
        csv_path = base_dir / 'data' / 'mutual_funds.csv'
        if not csv_path.exists():
            csv_path = Path('data/mutual_funds.csv')

        df = pd.read_csv(csv_path, sep=';', on_bad_lines='skip', encoding='utf-8')
        df = df[pd.to_numeric(df['Scheme Code'], errors='coerce').notna()]
        df['Scheme Code'] = df['Scheme Code'].astype(int)
        _MUTUAL_FUNDS_CACHE = df.set_index('Scheme Code')
        logger.info(f"Loaded {len(_MUTUAL_FUNDS_CACHE)} valid mutual fund records into cache.")
    except FileNotFoundError:
        logger.warning(f"Mutual fund data file not found at {csv_path}")
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


def calculate_technical_indicators(hist_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Calculates technical indicators: 14-day RSI, 20/50/200 EMAs, Volume Spikes, and Breakout signals.
    """
    if hist_df is None or hist_df.empty or len(hist_df) < 14:
        return {
            "rsi": 50.0,
            "ema_20": 0.0,
            "ema_50": 0.0,
            "ema_200": 0.0,
            "signal": "NEUTRAL",
            "volume_spike": False
        }

    close_col = 'Close' if 'Close' in hist_df.columns else ('close' if 'close' in hist_df.columns else None)
    if not close_col:
        return {
            "rsi": 50.0,
            "ema_20": 0.0,
            "ema_50": 0.0,
            "ema_200": 0.0,
            "signal": "NEUTRAL",
            "volume_spike": False
        }

    closes = pd.to_numeric(hist_df[close_col], errors='coerce').dropna()
    if closes.empty or len(closes) < 5:
        return {
            "rsi": 50.0,
            "ema_20": 0.0,
            "ema_50": 0.0,
            "ema_200": 0.0,
            "signal": "NEUTRAL",
            "volume_spike": False
        }

    vol_col = 'Volume' if 'Volume' in hist_df.columns else ('volume' if 'volume' in hist_df.columns else None)
    volumes = pd.to_numeric(hist_df[vol_col], errors='coerce').fillna(1000.0) if vol_col else pd.Series([1000.0] * len(closes), index=closes.index)

    # RSI 14
    delta = closes.diff()
    gain = delta.clip(lower=0)
    loss = -1.0 * delta.clip(upper=0)
    avg_gain = gain.rolling(window=14, min_periods=1).mean()
    avg_loss = loss.rolling(window=14, min_periods=1).mean()
    rs = avg_gain / (avg_loss + 1e-9)
    rsi_series = 100.0 - (100.0 / (1.0 + rs))
    rsi = float(rsi_series.iloc[-1]) if not rsi_series.empty and not pd.isna(rsi_series.iloc[-1]) else 50.0

    # EMAs
    ema_20 = float(closes.ewm(span=20, adjust=False).mean().iloc[-1])
    ema_50 = float(closes.ewm(span=50, adjust=False).mean().iloc[-1]) if len(closes) >= 50 else float(closes.iloc[-1])
    ema_200 = float(closes.ewm(span=200, adjust=False).mean().iloc[-1]) if len(closes) >= 200 else float(closes.iloc[-1])

    # Volume Spike
    avg_vol_20 = float(volumes.rolling(window=20).mean().iloc[-1]) if len(volumes) >= 20 else 1000.0
    latest_vol = float(volumes.iloc[-1])
    volume_spike = bool(latest_vol >= (avg_vol_20 * 1.5))

    curr_p = float(closes.iloc[-1])
    if curr_p > ema_20 and ema_20 > ema_50 and rsi > 55:
        signal = "BULLISH_BREAKOUT"
    elif curr_p < ema_20 and rsi < 45:
        signal = "BEARISH_PULLBACK"
    else:
        signal = "CONSOLIDATION"

    return {
        "rsi": round(rsi, 2),
        "ema_20": round(ema_20, 2),
        "ema_50": round(ema_50, 2),
        "ema_200": round(ema_200, 2),
        "signal": signal,
        "volume_spike": volume_spike
    }


def get_pkscreener_technical_scans(symbols: List[str] = None) -> List[Dict[str, Any]]:
    """
    Run PKScreener-inspired technical scanner across Indian stocks.
    """
    if not symbols:
        symbols = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "INDIGO.NS", "ASIANPAINT.NS"]

    scans = []
    for sym in symbols:
        hist = get_historical_data(sym, days=60)
        if not hist:
            continue
        df = pd.DataFrame(hist)
        indicators = calculate_technical_indicators(df)
        scans.append({
            "symbol": sym.replace(".NS", ""),
            "full_symbol": sym,
            "close_price": float(df['close'].iloc[-1]),
            **indicators
        })

    return scans
