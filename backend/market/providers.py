"""
InvestMitra Market Data Provider Interface
Abstracts market data sources (yfinance, Kite, Shoonya, Dhan, NSE Direct) for resilience.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
import logging
import yfinance as yf
import pandas as pd

logger = logging.getLogger(__name__)


class BaseMarketDataProvider(ABC):
    """Abstract Base Class for Market Data Providers."""

    @abstractmethod
    def get_stock_info(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        pass

    @abstractmethod
    def get_historical_data(self, symbol: str, days: int = 90) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get_current_price(self, symbol: str) -> float:
        pass


class YFinanceDataProvider(BaseMarketDataProvider):
    """Yahoo Finance Market Data Provider (Default Fallback)."""

    def get_stock_info(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        results = {}
        if not symbols:
            return results

        try:
            tickers = yf.Tickers(' '.join(symbols))
            for symbol in symbols:
                try:
                    ticker = tickers.tickers[symbol]
                    hist = ticker.history(period="5d")
                    if hist.empty:
                        continue

                    current_price = float(hist['Close'].iloc[-1])
                    prev_close = float(hist['Close'].iloc[-2]) if len(hist) > 1 else current_price
                    change = current_price - prev_close
                    change_pct = (change / prev_close) * 100.0 if prev_close else 0.0

                    info = ticker.info or {}
                    results[symbol] = {
                        "symbol": symbol,
                        "name": info.get('longName') or info.get('shortName') or symbol,
                        "exchange": info.get('exchange', 'NSE'),
                        "sector": info.get('sector', 'Other'),
                        "current_price": float(current_price),
                        "change": float(change),
                        "change_percent": float(change_pct),
                        "volume": int(info.get('volume') or (hist['Volume'].iloc[-1] if 'Volume' in hist.columns else 0)),
                        "market_cap": float(info.get('marketCap', 0)) if info.get('marketCap') else 0.0,
                        "pe_ratio": float(info.get('trailingPE', 0)) if info.get('trailingPE') else None,
                        "pb_ratio": float(info.get('priceToBook', 0)) if info.get('priceToBook') else None,
                        "roe": float(info.get('returnOnEquity', 0) * 100) if info.get('returnOnEquity') else None,
                        "ma_50": float(info.get('fiftyDayAverage') or current_price),
                        "ma_200": float(info.get('twoHundredDayAverage') or current_price)
                    }
                except Exception as e:
                    logger.warning(f"Provider failed for symbol {symbol}: {e}")
        except Exception as e:
            logger.error(f"YFinance provider error for batch {symbols}: {e}")

        return results

    def get_historical_data(self, symbol: str, days: int = 90) -> List[Dict[str, Any]]:
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
            logger.error(f"Historical data fetch error for {symbol}: {e}")
            return []

    def get_current_price(self, symbol: str) -> float:
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="1d")
            if not hist.empty:
                return float(hist['Close'].iloc[-1])
        except Exception as e:
            logger.error(f"Current price error for {symbol}: {e}")
        return 0.0


class MarketDataService:
    """Composite service managing primary and fallback market data providers."""

    def __init__(self, primary_provider: Optional[BaseMarketDataProvider] = None):
        self.primary_provider = primary_provider or YFinanceDataProvider()
        self.fallback_provider = YFinanceDataProvider()
        self.manual_price_overrides: Dict[str, float] = {
            "INDIGRID.NS": 169.00,
            "IRBINVIT.NS": 63.01
        }

    def get_price(self, symbol: str) -> float:
        if symbol in self.manual_price_overrides:
            return self.manual_price_overrides[symbol]
        price = self.primary_provider.get_current_price(symbol)
        if price <= 0:
            price = self.fallback_provider.get_current_price(symbol)
        return price

    def set_price_override(self, symbol: str, price: float):
        self.manual_price_overrides[symbol] = price
