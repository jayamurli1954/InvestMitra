"""
Watchlist Analytics Module
Handles fetching and managing high/low price data.

IMPORTANT: This module is COMPLETELY SEPARATE from market_data.py
- Does NOT touch existing price fetching logic
- Uses yfinance (different from NSE price fetch)
- Fails silently - won't break watchlist
- Updates independently via background tasks
"""

import logging
from typing import Dict, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Try to import yfinance
try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
    logger.info("✅ yfinance available for analytics")
except ImportError:
    YFINANCE_AVAILABLE = False
    logger.warning("⚠️  yfinance not installed - analytics will be limited")
    logger.warning("   Install with: pip install yfinance")


def fetch_high_low_data(symbol: str) -> Optional[Dict]:
    """
    Fetch 52-week and day high/low data for a stock.
    
    IMPORTANT: This is SEPARATE from the watchlist price fetching!
    - Uses yfinance (not NSE API)
    - Only for stocks (not mutual funds)
    - Returns None on failure (won't break anything)
    
    Args:
        symbol: Stock symbol (e.g., "RELIANCE", "INFY")
        
    Returns:
        Dict with high/low data, or None if fetch fails
        
    Example:
        >>> fetch_high_low_data("RELIANCE")
        {
            'week_52_high': 2855.50,
            'week_52_low': 2115.25,
            'day_high': 2750.00,
            'day_low': 2720.50
        }
    """
    
    if not YFINANCE_AVAILABLE:
        logger.warning(f"Cannot fetch analytics for {symbol} - yfinance not available")
        return None
    
    try:
        # Add .NS for NSE stocks
        ticker_symbol = f"{symbol}.NS"
        logger.info(f"📊 Fetching analytics for {ticker_symbol}")
        
        # Fetch ticker info
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info
        
        # Extract high/low data
        data = {
            'week_52_high': info.get('fiftyTwoWeekHigh'),
            'week_52_low': info.get('fiftyTwoWeekLow'),
            'day_high': info.get('dayHigh'),
            'day_low': info.get('dayLow'),
        }
        
        # Validate data
        if all(v is None for v in data.values()):
            logger.warning(f"⚠️  No analytics data available for {symbol}")
            return None
        
        logger.info(f"✅ Analytics fetched for {symbol}: 52W High: {data['week_52_high']}")
        return data
        
    except Exception as e:
        logger.error(f"❌ Error fetching analytics for {symbol}: {e}")
        return None


async def update_watchlist_analytics(
    db: AsyncIOMotorDatabase,
    user_id: str,
    symbol: str,
    force_refresh: bool = False
) -> bool:
    """
    Update or create analytics for a watchlist item.
    
    This is called SEPARATELY from watchlist operations:
    - Async/background task
    - Won't block watchlist loading
    - Fails silently - watchlist keeps working
    
    Args:
        db: MongoDB database
        user_id: User's ID
        symbol: Stock symbol
        force_refresh: Force fetch even if recently updated
        
    Returns:
        True if successful, False otherwise
    """
    
    analytics_collection = db['watchlist_analytics']
    
    try:
        # Check if recently updated (skip if updated in last hour)
        if not force_refresh:
            existing = await analytics_collection.find_one({
                'user_id': user_id,
                'symbol': symbol
            })
            
            if existing:
                last_updated = existing.get('last_updated')
                if last_updated:
                    age = datetime.utcnow() - last_updated
                    if age < timedelta(hours=1):
                        logger.info(f"⏭️  Skipping {symbol} - updated {age.seconds//60} min ago")
                        return True
        
        # Fetch high/low data
        logger.info(f"🔄 Updating analytics for {user_id}/{symbol}")
        high_low_data = fetch_high_low_data(symbol)
        
        if not high_low_data:
            # Store failure status
            await analytics_collection.update_one(
                {'user_id': user_id, 'symbol': symbol},
                {
                    '$set': {
                        'user_id': user_id,
                        'symbol': symbol,
                        'fetch_status': 'failed',
                        'error_message': 'No data available',
                        'last_updated': datetime.utcnow(),
                        'updated_at': datetime.utcnow()
                    },
                    '$setOnInsert': {
                        'created_at': datetime.utcnow()
                    }
                },
                upsert=True
            )
            return False
        
        # Store analytics data
        analytics_doc = {
            'user_id': user_id,
            'symbol': symbol,
            **high_low_data,
            'last_updated': datetime.utcnow(),
            'fetch_status': 'success',
            'error_message': None,
            'data_source': 'yfinance',
            'updated_at': datetime.utcnow()
        }
        
        await analytics_collection.update_one(
            {'user_id': user_id, 'symbol': symbol},
            {
                '$set': analytics_doc,
                '$setOnInsert': {'created_at': datetime.utcnow()}
            },
            upsert=True
        )
        
        logger.info(f"✅ Analytics updated for {symbol}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error updating analytics for {symbol}: {e}")
        return False


async def get_watchlist_analytics(
    db: AsyncIOMotorDatabase,
    user_id: str,
    symbol: str
) -> Optional[Dict]:
    """
    Get analytics for a specific watchlist item.
    
    Args:
        db: MongoDB database
        user_id: User's ID
        symbol: Stock symbol
        
    Returns:
        Analytics data or None if not available
    """
    
    analytics_collection = db['watchlist_analytics']
    
    try:
        analytics = await analytics_collection.find_one({
            'user_id': user_id,
            'symbol': symbol
        })
        
        if not analytics:
            return None
        
        # Return only relevant fields
        return {
            'week_52_high': analytics.get('week_52_high'),
            'week_52_low': analytics.get('week_52_low'),
            'day_high': analytics.get('day_high'),
            'day_low': analytics.get('day_low'),
            'last_updated': analytics.get('last_updated'),
            'status': analytics.get('fetch_status', 'unknown')
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting analytics for {symbol}: {e}")
        return None


async def bulk_update_analytics(
    db: AsyncIOMotorDatabase,
    user_id: str,
    symbols: list,
    is_mutual_funds: dict
) -> Dict[str, bool]:
    """
    Update analytics for multiple watchlist items.
    
    Used for batch updates (e.g., when user loads watchlist).
    Only updates stocks (skips mutual funds).
    
    Args:
        db: MongoDB database
        user_id: User's ID
        symbols: List of symbols
        is_mutual_funds: Dict mapping symbol to is_mutual_fund bool
        
    Returns:
        Dict mapping symbol to success status
    """
    
    results = {}
    
    for symbol in symbols:
        # Skip mutual funds (they don't have high/low)
        if is_mutual_funds.get(symbol, False):
            logger.info(f"⏭️  Skipping {symbol} - mutual fund")
            results[symbol] = False
            continue
        
        # Update analytics
        success = await update_watchlist_analytics(db, user_id, symbol)
        results[symbol] = success
    
    successful = sum(1 for v in results.values() if v)
    logger.info(f"✅ Updated analytics for {successful}/{len(symbols)} items")
    
    return results


async def cleanup_old_analytics(
    db: AsyncIOMotorDatabase,
    days: int = 30
) -> int:
    """
    Remove analytics data older than specified days.
    
    Useful for maintenance - keeps database clean.
    
    Args:
        db: MongoDB database
        days: Remove data older than this many days
        
    Returns:
        Number of documents deleted
    """
    
    analytics_collection = db['watchlist_analytics']
    
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        result = await analytics_collection.delete_many({
            'updated_at': {'$lt': cutoff_date}
        })
        
        deleted = result.deleted_count
        logger.info(f"🧹 Cleaned up {deleted} old analytics records")
        
        return deleted
        
    except Exception as e:
        logger.error(f"❌ Error cleaning up analytics: {e}")
        return 0
