"""
Watchlist Analytics Models
Separate collection for analytics data (high/low prices, etc.)
COMPLETELY INDEPENDENT from main watchlist collection

This ensures analytics features cannot break existing watchlist functionality.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
import uuid


class WatchlistAnalytics(BaseModel):
    """
    Analytics data for watchlist items.
    
    Stored separately from main watchlist to ensure:
    - Zero risk to existing watchlist operations
    - Independent updates
    - Easy rollback if needed
    - Future analytics features can be added here
    
    Linked to watchlist via: user_id + symbol
    """
    
    # Primary identifiers
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    id: str = Field(alias="_id")
    user_id: str
    symbol: str
    name: str
    asset_type: str

    
    
    # 52-week high/low (from yfinance)
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None
    
    # Day high/low (from yfinance)
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    
    # Future analytics can be added here:
    # - Average volume
    # - Beta
    # - Market cap changes
    # - etc.
    
    # Metadata
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    data_source: str = "yfinance"  # Track data source
    fetch_status: str = "success"   # success, failed, pending
    error_message: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        """MongoDB collection configuration"""
        collection = "watchlist_analytics"
        
        # Example document
        schema_extra = {
            "example": {
                "user_id": "5a992604-e10c-40ec-96dc-d6331bf03ea0",
                "symbol": "RELIANCE",
                "week_52_high": 2855.50,
                "week_52_low": 2115.25,
                "day_high": 2750.00,
                "day_low": 2720.50,
                "last_updated": "2025-11-02T06:30:00Z",
                "data_source": "yfinance",
                "fetch_status": "success"
            }
        }


class AnalyticsUpdateRequest(BaseModel):
    """Request model for updating analytics"""
    symbol: str
    force_refresh: bool = False  # Force fetch even if recently updated


class AnalyticsResponse(BaseModel):
    """Response model with analytics data"""
    symbol: str
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    last_updated: Optional[datetime] = None
    status: str = "not_available"  # success, not_available, error
