"""
Pydantic models for validating external API responses
Ensures data integrity from yfinance and other external sources
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


class YFinanceStockInfo(BaseModel):
    """Validation model for yfinance stock info"""
    symbol: str
    name: str = Field(default="Unknown")
    exchange: str = Field(default="N/A")
    sector: str = Field(default="Other")
    current_price: float = Field(gt=0)
    change: float
    change_percent: float
    volume: int = Field(ge=0)
    market_cap: float = Field(ge=0)
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    roe: Optional[float] = None
    debt_to_equity: Optional[float] = None
    dividend_yield: Optional[float] = None
    week_52_high: float = Field(gt=0)
    week_52_low: float = Field(gt=0)
    rsi: Optional[float] = None
    ma_50: float
    ma_200: float

    @validator('pe_ratio', 'pb_ratio', 'roe', 'debt_to_equity', 'dividend_yield')
    def validate_optional_floats(cls, v):
        """Ensure optional floats are valid if present"""
        if v is not None and (v < 0 or v > 1000000):
            return None
        return v

    @validator('week_52_low', 'week_52_high')
    def validate_52_week_range(cls, v, values):
        """Ensure 52-week range is valid"""
        if 'week_52_low' in values and v > 0:
            if v < values['week_52_low']:
                # week_52_high cannot be less than week_52_low
                return values['week_52_low']
        return v

    class Config:
        # Allow extra fields from API that we don't use
        extra = 'ignore'


class HistoricalDataPoint(BaseModel):
    """Validation model for historical stock data point"""
    date: str
    open: float = Field(gt=0)
    high: float = Field(gt=0)
    low: float = Field(gt=0)
    close: float = Field(gt=0)
    volume: int = Field(ge=0)

    @validator('high')
    def validate_high(cls, v, values):
        """High should be >= low and open"""
        if 'low' in values and v < values['low']:
            return values['low']
        return v

    @validator('low')
    def validate_low(cls, v, values):
        """Low should be <= open"""
        if 'open' in values and v > values['open']:
            return values['open']
        return v

    class Config:
        extra = 'ignore'


class MarketIndex(BaseModel):
    """Validation model for market index data"""
    symbol: str
    name: str
    current_price: float = Field(gt=0)
    change: float
    change_percent: float

    class Config:
        extra = 'ignore'


class MutualFundNAV(BaseModel):
    """Validation model for mutual fund NAV"""
    scheme_code: str
    scheme_name: str
    current_nav: float = Field(gt=0)
    date: str
    change: Optional[float] = None
    change_percent: Optional[float] = None

    class Config:
        extra = 'ignore'


def safe_float(value: any, default: float = 0.0) -> float:
    """Safely convert value to float with fallback"""
    try:
        if value is None or value == '' or str(value).lower() in ['nan', 'inf', '-inf']:
            return default
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_int(value: any, default: int = 0) -> int:
    """Safely convert value to int with fallback"""
    try:
        if value is None or value == '':
            return default
        return int(float(value))  # Convert via float first to handle decimals
    except (ValueError, TypeError):
        return default


def safe_string(value: any, default: str = "Unknown") -> str:
    """Safely convert value to string with fallback"""
    try:
        if value is None or value == '':
            return default
        return str(value)
    except Exception:
        return default
