"""
InvestMitra Market Data Provider Interface
Abstracts market data sources (yfinance, Kite, Shoonya, Dhan, NSE Direct) for resilience.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
import os
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

    def get_holdings(self) -> List[Dict[str, Any]]:
        """Return the connected account's equity holdings in a normalized shape:
        [{symbol, name, quantity, avg_cost, ltp, exchange}]. Default: none
        (yfinance and quote-only providers have no account holdings)."""
        return []


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


class ShoonyaDataProvider(BaseMarketDataProvider):
    """
    Shoonya (Finvasia) market-data provider over the OAuth API.

    Uses the access token produced by market.shoonya_connect (stored in
    SHOONYA_ACCESS_TOKEN). Data calls authenticate via a Bearer header, so once a
    token is present no interactive login is needed until it expires. Falls back
    gracefully (returns empty / 0.0) when not connected, so MarketDataService can
    defer to yfinance.
    """

    DEFAULT_HOST = "https://api.shoonya.com/NorenWClientAPI/"
    DEFAULT_WS = "wss://api.shoonya.com/NorenWSAPI/"

    def __init__(self):
        self._api = None
        self._token_cache: Dict[str, str] = {}
        self._ready = False
        try:
            from NorenRestApiPy.NorenApi import NorenApi
        except Exception as e:
            logger.warning(f"Shoonya SDK not installed; provider disabled: {e}")
            return

        access_token = os.getenv("SHOONYA_ACCESS_TOKEN")
        uid = os.getenv("SHOONYA_USER_ID")
        actid = os.getenv("SHOONYA_ACTID") or uid
        if not access_token or not uid:
            logger.warning("Shoonya not connected (run market.shoonya_connect); provider disabled.")
            return

        host = os.getenv("SHOONYA_HOST", self.DEFAULT_HOST)
        ws = os.getenv("SHOONYA_WS", self.DEFAULT_WS)
        try:
            self._api = NorenApi(host=host, websocket=ws)
            self._api.injectOAuthHeader(access_token, uid, actid)
            self._ready = True
            logger.info("✓ Shoonya provider initialised (OAuth token loaded).")
        except Exception as e:
            logger.error(f"Shoonya provider init failed: {e}")

    @staticmethod
    def _clean(symbol: str) -> str:
        return symbol.upper().replace(".NS", "").replace(".BO", "").strip()

    def _resolve_token(self, symbol: str, exchange: str = "NSE") -> Optional[str]:
        """Resolve a trading symbol to Shoonya's numeric token (cached)."""
        clean = self._clean(symbol)
        if clean in self._token_cache:
            return self._token_cache[clean]
        try:
            res = self._api.searchscrip(exchange=exchange, searchtext=clean)
            values = (res or {}).get("values", [])
            match = next(
                (v for v in values if v.get("tsym", "").upper() == f"{clean}-EQ"),
                values[0] if values else None,
            )
            token = match.get("token") if match else None
            if token:
                self._token_cache[clean] = token
            return token
        except Exception as e:
            logger.warning(f"Shoonya token resolve failed for {symbol}: {e}")
            return None

    def get_current_price(self, symbol: str) -> float:
        if not self._ready:
            return 0.0
        token = self._resolve_token(symbol)
        if not token:
            return 0.0
        try:
            q = self._api.get_quotes(exchange="NSE", token=token)
            lp = (q or {}).get("lp")
            return float(lp) if lp else 0.0
        except Exception as e:
            logger.warning(f"Shoonya price fetch failed for {symbol}: {e}")
            return 0.0

    def get_stock_info(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        results: Dict[str, Dict[str, Any]] = {}
        if not self._ready:
            return results
        for symbol in symbols or []:
            token = self._resolve_token(symbol)
            if not token:
                continue
            try:
                q = self._api.get_quotes(exchange="NSE", token=token) or {}
                lp = float(q.get("lp") or 0.0)
                prev = float(q.get("c") or lp)  # 'c' = previous close
                change = lp - prev
                change_pct = (change / prev * 100.0) if prev else 0.0
                results[symbol] = {
                    "symbol": symbol,
                    "name": q.get("cname") or q.get("tsym") or symbol,
                    "exchange": q.get("exch", "NSE"),
                    "sector": "Other",  # Shoonya quotes carry no sector/fundamentals
                    "current_price": lp,
                    "change": change,
                    "change_percent": change_pct,
                    "volume": int(float(q.get("v") or 0)),
                    "market_cap": 0.0,
                    "pe_ratio": None,
                    "pb_ratio": None,
                    "roe": None,
                    "ma_50": lp,
                    "ma_200": lp,
                }
            except Exception as e:
                logger.warning(f"Shoonya stock info failed for {symbol}: {e}")
        return results

    def get_historical_data(self, symbol: str, days: int = 90) -> List[Dict[str, Any]]:
        if not self._ready:
            return []
        token = self._resolve_token(symbol)
        if not token:
            return []
        try:
            from datetime import datetime, timedelta
            start = (datetime.now() - timedelta(days=days)).replace(hour=9, minute=15, second=0)
            series = self._api.get_time_price_series(
                exchange="NSE", token=token,
                starttime=start.timestamp(), interval="1440",  # daily candles
            ) or []
            data = []
            for row in reversed(series):  # Shoonya returns newest-first
                ts = row.get("time") or row.get("ssboe")
                try:
                    date = datetime.strptime(ts, "%d-%m-%Y %H:%M:%S").strftime("%Y-%m-%d")
                except Exception:
                    date = str(ts)
                data.append({
                    "date": date,
                    "open": float(row.get("into") or 0),
                    "high": float(row.get("inth") or 0),
                    "low": float(row.get("intl") or 0),
                    "close": float(row.get("intc") or 0),
                    "volume": int(float(row.get("intv") or 0)),
                })
            return data
        except Exception as e:
            logger.warning(f"Shoonya historical fetch failed for {symbol}: {e}")
            return []


class FyersDataProvider(BaseMarketDataProvider):
    """
    Fyers (API v3) market-data provider — READ-ONLY (quotes, history, holdings).

    Uses the access token produced by market.fyers_connect (FYERS_ACCESS_TOKEN).
    This provider never places orders; it only reads market data. Degrades to
    empty/0.0 when not connected so MarketDataService defers to yfinance.
    """

    def __init__(self, creds: Optional[Dict[str, str]] = None):
        self._fyers = None
        self._ready = False
        try:
            from fyers_apiv3 import fyersModel
        except Exception as e:
            logger.warning(f"Fyers SDK not installed; provider disabled: {e}")
            return

        # Per-user credentials take priority; env is the single-user fallback.
        creds = creds or {}
        app_id = creds.get("app_id") or creds.get("api_key") or os.getenv("FYERS_APP_ID")
        access_token = creds.get("access_token") or os.getenv("FYERS_ACCESS_TOKEN")
        if not app_id or not access_token:
            logger.warning("Fyers not connected; provider disabled.")
            return
        try:
            self._fyers = fyersModel.FyersModel(client_id=app_id, token=access_token, is_async=False, log_path="")
            self._ready = True
            logger.info("✓ Fyers provider initialised (OAuth token loaded).")
        except Exception as e:
            logger.error(f"Fyers provider init failed: {e}")

    @staticmethod
    def _fy_symbol(symbol: str) -> str:
        """Map 'RELIANCE' / 'RELIANCE.NS' to Fyers 'NSE:RELIANCE-EQ'."""
        clean = symbol.upper().replace(".NS", "").replace(".BO", "").strip()
        return f"NSE:{clean}-EQ"

    def get_current_price(self, symbol: str) -> float:
        if not self._ready:
            return 0.0
        try:
            r = self._fyers.quotes({"symbols": self._fy_symbol(symbol)})
            d = (r or {}).get("d") or []
            if d and d[0].get("s") == "ok":
                return float(d[0]["v"].get("lp") or 0.0)
        except Exception as e:
            logger.warning(f"Fyers price fetch failed for {symbol}: {e}")
        return 0.0

    def get_stock_info(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        results: Dict[str, Dict[str, Any]] = {}
        if not self._ready or not symbols:
            return results
        fy_map = {self._fy_symbol(s): s for s in symbols}
        fy_symbols = list(fy_map)
        # Fyers quotes GET is capped at 50 symbols per request — batch accordingly.
        for i in range(0, len(fy_symbols), 50):
            batch = fy_symbols[i:i + 50]
            try:
                r = self._fyers.quotes({"symbols": ",".join(batch)})
                for row in (r or {}).get("d") or []:
                    if row.get("s") != "ok":
                        continue
                    orig = fy_map.get(row.get("n"))
                    v = row.get("v") or {}
                    lp = float(v.get("lp") or 0.0)
                    results[orig or row.get("n")] = {
                        "symbol": orig or row.get("n"),
                        "name": v.get("short_name") or orig or row.get("n"),
                        "exchange": "NSE",
                        "sector": "Other",  # Fyers quotes carry no sector/fundamentals
                        "current_price": lp,
                        "change": float(v.get("ch") or 0.0),
                        "change_percent": float(v.get("chp") or 0.0),
                        "volume": int(float(v.get("volume") or 0)),
                        "market_cap": 0.0,
                        "pe_ratio": None,
                        "pb_ratio": None,
                        "roe": None,
                        "ma_50": lp,
                        "ma_200": lp,
                    }
            except Exception as e:
                logger.warning(f"Fyers stock info failed for batch {i//50}: {e}")
        return results

    def get_historical_data(self, symbol: str, days: int = 90) -> List[Dict[str, Any]]:
        if not self._ready:
            return []
        try:
            from datetime import datetime, timedelta
            end = datetime.now()
            start = end - timedelta(days=days)
            r = self._fyers.history({
                "symbol": self._fy_symbol(symbol),
                "resolution": "D",
                "date_format": "1",
                "range_from": start.strftime("%Y-%m-%d"),
                "range_to": end.strftime("%Y-%m-%d"),
                "cont_flag": "1",
            })
            data = []
            for c in (r or {}).get("candles") or []:
                # candle: [epoch, open, high, low, close, volume]
                data.append({
                    "date": datetime.fromtimestamp(c[0]).strftime("%Y-%m-%d"),
                    "open": float(c[1]), "high": float(c[2]),
                    "low": float(c[3]), "close": float(c[4]),
                    "volume": int(c[5]),
                })
            return data
        except Exception as e:
            logger.warning(f"Fyers historical fetch failed for {symbol}: {e}")
            return []

    def get_holdings(self) -> List[Dict[str, Any]]:
        """Fetch the connected Fyers account's equity holdings, normalized."""
        if not self._ready:
            return []
        try:
            r = self._fyers.holdings()
            if (r or {}).get("s") != "ok":
                return []
            out = []
            for h in (r or {}).get("holdings") or []:
                # Fyers symbol like 'NSE:RELIANCE-EQ' -> 'RELIANCE'
                fy_sym = h.get("symbol", "")
                clean = fy_sym.split(":")[-1].replace("-EQ", "").strip() if fy_sym else ""
                qty = float(h.get("quantity") or 0)
                if not clean or qty <= 0:
                    continue
                out.append({
                    "symbol": clean,
                    "name": clean,
                    "quantity": qty,
                    "avg_cost": float(h.get("costPrice") or 0),
                    "ltp": float(h.get("ltp") or 0),
                    "exchange": "NSE" if fy_sym.startswith("NSE") else (fy_sym.split(":")[0] if ":" in fy_sym else "NSE"),
                })
            return out
        except Exception as e:
            logger.warning(f"Fyers holdings fetch failed: {e}")
            return []


class AngelOneDataProvider(BaseMarketDataProvider):
    """
    Angel One (SmartAPI) provider — used as a HOLDINGS source (read-only).

    Angel logs in with API key + client code + MPIN + TOTP (no OAuth redirect),
    so it connects straight from stored credentials. Quote methods are no-ops here
    (Angel is used to import the user's holdings, not to serve quotes); prices come
    from the market-data provider / yfinance. Disables cleanly when not configured.
    """

    def __init__(self, creds: Optional[Dict[str, str]] = None):
        self._api = None
        self._ready = False
        self._token_cache: Dict[str, str] = {}
        try:
            from SmartApi import SmartConnect
            import pyotp
        except Exception as e:
            logger.warning(f"Angel SmartAPI SDK not installed; provider disabled: {e}")
            return

        # Per-user credentials take priority; fall back to env for single-user setups.
        creds = creds or {}
        api_key = creds.get("api_key") or os.getenv("ANGEL_API_KEY")
        client_code = (creds.get("client_code") or creds.get("client_id")
                       or os.getenv("ANGEL_CLIENT_CODE") or os.getenv("ANGEL_CLIENT_ID"))
        mpin = (creds.get("mpin") or creds.get("password")
                or os.getenv("ANGEL_MPIN") or os.getenv("ANGEL_PASSWORD"))
        totp_secret = creds.get("totp_secret") or os.getenv("ANGEL_TOTP_SECRET")
        if not all([api_key, client_code, mpin, totp_secret]):
            logger.warning("Angel One not configured (ANGEL_* env); provider disabled.")
            return
        try:
            self._api = SmartConnect(api_key=api_key)
            otp = pyotp.TOTP(totp_secret).now()
            sess = self._api.generateSession(client_code, mpin, otp)
            if not (sess or {}).get("status"):
                logger.error(f"Angel session failed: {(sess or {}).get('message')}")
                self._api = None
                return
            self._ready = True
            logger.info("✓ Angel One provider initialised (session established).")
        except Exception as e:
            logger.error(f"Angel One init failed: {e}")
            self._api = None

    def _resolve_token(self, symbol: str, exchange: str = "NSE") -> Optional[str]:
        """Resolve a symbol to Angel's numeric token via searchScrip (cached)."""
        clean = symbol.upper().replace(".NS", "").replace(".BO", "").strip()
        if clean in self._token_cache:
            return self._token_cache[clean]
        try:
            r = self._api.searchScrip(exchange, clean)
            hits = (r or {}).get("data") or []
            match = next((h for h in hits if h.get("tradingsymbol", "").upper() == f"{clean}-EQ"),
                         hits[0] if hits else None)
            token = match.get("symboltoken") if match else None
            if token:
                self._token_cache[clean] = token
            return token
        except Exception as e:
            logger.warning(f"Angel token resolve failed for {symbol}: {e}")
            return None

    def get_current_price(self, symbol: str) -> float:
        if not self._ready:
            return 0.0
        token = self._resolve_token(symbol)
        if not token:
            return 0.0
        try:
            md = self._api.getMarketData("LTP", {"NSE": [token]})
            fetched = ((md or {}).get("data") or {}).get("fetched") or []
            if fetched:
                return float(fetched[0].get("ltp") or 0.0)
        except Exception as e:
            logger.warning(f"Angel price fetch failed for {symbol}: {e}")
        return 0.0

    def get_stock_info(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        results: Dict[str, Dict[str, Any]] = {}
        if not self._ready or not symbols:
            return results
        # Resolve tokens, keeping token -> original symbol so we can map results back.
        tok_to_sym = {}
        for s in symbols:
            tok = self._resolve_token(s)
            if tok:
                tok_to_sym[str(tok)] = s
        tokens = list(tok_to_sym)
        # getMarketData FULL is capped at 50 tokens per call.
        for i in range(0, len(tokens), 50):
            batch = tokens[i:i + 50]
            try:
                md = self._api.getMarketData("FULL", {"NSE": batch})
                for f in ((md or {}).get("data") or {}).get("fetched") or []:
                    orig = tok_to_sym.get(str(f.get("symbolToken")))
                    if not orig:
                        continue
                    lp = float(f.get("ltp") or 0.0)
                    results[orig] = {
                        "symbol": orig,
                        "name": f.get("tradingSymbol") or orig,
                        "exchange": "NSE",
                        "sector": "Other",  # Angel quotes carry no sector/fundamentals
                        "current_price": lp,
                        "change": float(f.get("netChange") or 0.0),
                        "change_percent": float(f.get("percentChange") or 0.0),
                        "volume": int(float(f.get("tradeVolume") or 0)),
                        "market_cap": 0.0,
                        "pe_ratio": None, "pb_ratio": None, "roe": None,
                        "ma_50": lp, "ma_200": lp,
                    }
            except Exception as e:
                logger.warning(f"Angel market data failed for batch {i//50}: {e}")
        return results

    def get_historical_data(self, symbol: str, days: int = 90) -> List[Dict[str, Any]]:
        if not self._ready:
            return []
        token = self._resolve_token(symbol)
        if not token:
            return []
        try:
            from datetime import datetime, timedelta
            end = datetime.now()
            start = end - timedelta(days=days)
            params = {
                "exchange": "NSE", "symboltoken": token, "interval": "ONE_DAY",
                "fromdate": start.strftime("%Y-%m-%d 09:15"),
                "todate": end.strftime("%Y-%m-%d 15:30"),
            }
            r = self._api.getCandleData(params)
            data = []
            for c in (r or {}).get("data") or []:
                # candle: [timestamp, open, high, low, close, volume]
                data.append({
                    "date": str(c[0])[:10],
                    "open": float(c[1]), "high": float(c[2]),
                    "low": float(c[3]), "close": float(c[4]),
                    "volume": int(c[5]),
                })
            return data
        except Exception as e:
            logger.warning(f"Angel historical fetch failed for {symbol}: {e}")
            return []

    def get_holdings(self) -> List[Dict[str, Any]]:
        """Fetch the connected Angel account's equity holdings, normalized."""
        if not self._ready:
            return []
        try:
            r = self._api.holding()
            if not (r or {}).get("status"):
                return []
            out = []
            for h in (r or {}).get("data") or []:
                ts = (h.get("tradingsymbol") or "").upper()
                clean = ts.replace("-EQ", "").strip()
                qty = float(h.get("quantity") or 0)
                if not clean or qty <= 0:
                    continue
                out.append({
                    "symbol": clean,
                    "name": clean,
                    "quantity": qty,
                    "avg_cost": float(h.get("averageprice") or 0),
                    "ltp": float(h.get("ltp") or 0),
                    "exchange": h.get("exchange", "NSE"),
                })
            return out
        except Exception as e:
            logger.warning(f"Angel holdings fetch failed: {e}")
            return []


def build_holdings_providers():
    """Return [(display_name, provider)] for configured, connected holdings-capable
    brokers (currently from env; per-user credentials come later). Each is live-
    logged-in, so call this on demand (e.g. a manual "Sync" action), not per request."""
    out = []
    angel = AngelOneDataProvider()
    if getattr(angel, "_ready", False):
        out.append(("Angel One", angel))
    fyers = FyersDataProvider()
    if getattr(fyers, "_ready", False) and fyers.get_holdings():
        out.append(("Fyers", fyers))
    return out


def build_primary_provider() -> BaseMarketDataProvider:
    """Select the primary market-data provider from the PRIMARY_PROVIDER env var."""
    choice = (os.getenv("PRIMARY_PROVIDER") or "yfinance").strip().lower()
    if choice == "shoonya":
        provider = ShoonyaDataProvider()
        if getattr(provider, "_ready", False):
            return provider
        logger.warning("PRIMARY_PROVIDER=shoonya but not connected; using yfinance.")
    elif choice == "fyers":
        provider = FyersDataProvider()
        if getattr(provider, "_ready", False):
            return provider
        logger.warning("PRIMARY_PROVIDER=fyers but not connected; using yfinance.")
    elif choice == "angel":
        provider = AngelOneDataProvider()
        if getattr(provider, "_ready", False):
            return provider
        logger.warning("PRIMARY_PROVIDER=angel but not connected; using yfinance.")
    return YFinanceDataProvider()


class MarketDataService:
    """Composite service managing primary and fallback market data providers."""

    def __init__(self, primary_provider: Optional[BaseMarketDataProvider] = None):
        self.primary_provider = primary_provider or build_primary_provider()
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
