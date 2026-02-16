from pathlib import Path
import os
import asyncio
from dotenv import load_dotenv

# Load .env FIRST before importing auth_utils
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, Cookie, Response, Request, WebSocket
import pandas as pd
from websocket_manager import manager
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import logging
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import random
import requests
import io
from fastapi.responses import StreamingResponse, JSONResponse
from decimal import Decimal, ROUND_HALF_UP

# Import configuration (this will validate environment variables)
from config import config, is_email_enabled, is_ai_enabled

from auth_utils import (
    User, UserPublic, UserSession, UserRegister, UserLogin, Token,
    verify_password, get_password_hash, create_access_token, decode_access_token
)
from market_data import (
    get_stock_info, get_historical_data, get_market_indices,
    get_major_world_stocks, get_mutual_fund_nav, get_exchange_rate,
    search_equities
)
from performance import (
    generate_performance_summary, calculate_win_rate, calculate_sector_performance
)
from analytics import (
    calculate_portfolio_analytics,
    calculate_rebalancing_suggestions,
    generate_stock_recommendations,
)
from routes.auth_recovery import create_auth_recovery_router

# MongoDB connection - will be initialized on app startup
client = None
db = None
ticker_task = None

async def init_db():
    """Initialize MongoDB connection on startup with retry logic"""
    global client, db
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        # Try connecting to real MongoDB first
        client = AsyncIOMotorClient(config.MONGO_URL, serverSelectionTimeoutMS=2000)
        db = client[config.DB_NAME]
        # Test connection
        await db.command('ping')
        logging.info("✓ MongoDB connected successfully")
    except Exception as e:
        logging.warning(f"⚠ MongoDB connection failed: {e}")
        logging.warning("⚠ Switching to In-Memory Mock Database (Data will be lost on restart)")
        try:
            from mongomock_motor import AsyncMongoMockClient
            client = AsyncMongoMockClient()
            db = client[config.DB_NAME]
            logging.info("✓ Mock Database initialized successfully")
        except ImportError:
            logging.error("✗ Failed to initialize Mock DB: mongomock_motor not installed")
            db = None
            client = None
        except Exception as mock_error:
            logging.error(f"✗ Mock DB initialization failed: {mock_error}")
            db = None
            client = None

async def close_db():
    """Close MongoDB connection on shutdown"""
    global client
    if client:
        client.close()
        logging.info("MongoDB connection closed")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Rate limiting configuration
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
origins = config.CORS_ORIGINS
logger.info(f"CORS origins configured: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register startup and shutdown events
@app.on_event("startup")
async def startup_event():
    global ticker_task
    await init_db()
    # Start the ticker simulation task once.
    if ticker_task is None or ticker_task.done():
        ticker_task = asyncio.create_task(simulate_ticker_updates())

@app.on_event("shutdown")
async def shutdown_event():
    global ticker_task
    if ticker_task and not ticker_task.done():
        ticker_task.cancel()
        try:
            await ticker_task
        except asyncio.CancelledError:
            pass
        ticker_task = None
    await close_db()

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    health_status = {
        "status": "healthy",
        "mongodb": "disconnected",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    # Check MongoDB connection
    if db is not None:
        try:
            await db.command('ping')
            health_status["mongodb"] = "connected"
        except Exception as e:
            health_status["mongodb"] = f"error: {str(e)}"
            health_status["status"] = "degraded"
    else:
        health_status["status"] = "degraded"

    return health_status

@app.get("/")
async def root():
    """Root endpoint for status check"""
    return {
        "message": "InvestMitra Backend Running", 
        "status": "Online",
        "db_mode": "Real (MongoDB)" if "mongomock" not in str(type(client)) and client is not None else "In-Memory (Mock)"
    }

# Cache statistics endpoint (for monitoring)
@app.get("/cache-stats")
async def get_cache_stats():
    """Get cache statistics for monitoring"""
    return cache_instance.get_stats()

api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

import time
from functools import wraps
from collections import OrderedDict
from typing import Optional, Pattern
import re

class ImprovedCache:
    """Enhanced caching with TTL, size limits, and invalidation"""

    def __init__(self, default_ttl: int = 60, max_size: int = 1000):
        self.cache = OrderedDict()  # Maintains insertion order for LRU eviction
        self.default_ttl = default_ttl
        self.max_size = max_size
        self.stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'invalidations': 0
        }

    def get(self, key: str) -> Optional[any]:
        """Get cached value if not expired"""
        if key in self.cache:
            data, timestamp, ttl = self.cache[key]
            if (time.time() - timestamp) < ttl:
                self.stats['hits'] += 1
                # Move to end (most recently used)
                self.cache.move_to_end(key)
                return data
            else:
                # Expired, remove it
                del self.cache[key]

        self.stats['misses'] += 1
        return None

    def set(self, key: str, value: any, ttl: Optional[int] = None):
        """Set cached value with optional custom TTL"""
        if ttl is None:
            ttl = self.default_ttl

        # Check size limit and evict oldest if necessary
        if key not in self.cache and len(self.cache) >= self.max_size:
            # Remove oldest (first) item
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
            self.stats['evictions'] += 1
            logger.debug(f"Cache full, evicted oldest key: {oldest_key}")

        self.cache[key] = (value, time.time(), ttl)
        # Move to end (most recently used)
        self.cache.move_to_end(key)

    def invalidate(self, key: str) -> bool:
        """Invalidate a specific cache key"""
        if key in self.cache:
            del self.cache[key]
            self.stats['invalidations'] += 1
            logger.debug(f"Cache invalidated: {key}")
            return True
        return False

    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching a pattern (regex)"""
        regex = re.compile(pattern)
        keys_to_delete = [key for key in self.cache.keys() if regex.match(key)]

        for key in keys_to_delete:
            del self.cache[key]
            self.stats['invalidations'] += 1

        if keys_to_delete:
            logger.debug(f"Cache invalidated {len(keys_to_delete)} keys matching pattern: {pattern}")

        return len(keys_to_delete)

    def invalidate_user(self, user_id: str) -> int:
        """Invalidate all cache entries for a specific user"""
        return self.invalidate_pattern(f".*:{user_id}$")

    def clear(self):
        """Clear all cache entries"""
        count = len(self.cache)
        self.cache.clear()
        self.stats['invalidations'] += count
        logger.info(f"Cache cleared: {count} entries removed")

    def get_stats(self) -> dict:
        """Get cache statistics"""
        total_requests = self.stats['hits'] + self.stats['misses']
        hit_rate = (self.stats['hits'] / total_requests * 100) if total_requests > 0 else 0

        return {
            **self.stats,
            'size': len(self.cache),
            'max_size': self.max_size,
            'hit_rate': round(hit_rate, 2)
        }

cache_instance = ImprovedCache(default_ttl=60, max_size=1000)

def cached(key_prefix: str, ttl: Optional[int] = None):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            user_id = current_user.id if current_user else 'public'
            cache_key = f"{key_prefix}:{user_id}"

            cached_data = cache_instance.get(cache_key)
            if cached_data is not None:
                logger.info(f"Cache hit for {cache_key}")
                return cached_data

            logger.info(f"Cache miss for {cache_key}, fetching data...")
            result = await func(*args, **kwargs)
            cache_instance.set(cache_key, result, ttl=ttl)
            return result
        return wrapper
    return decorator

# ==================== CACHED MARKET DATA FUNCTIONS ====================

def get_cached_stock_info(symbols):
    """
    Get stock info with 5-minute caching to prevent rate limiting.

    Args:
        symbols: Single symbol string or list of symbol strings

    Returns:
        Dict mapping symbols to their stock data
    """
    if isinstance(symbols, str):
        symbols = [symbols]

    results = {}
    uncached_symbols = []

    # Check cache for each symbol
    for symbol in symbols:
        cache_key = f"stock_info:{symbol}"
        cached_data = cache_instance.get(cache_key)
        if cached_data is not None:
            results[symbol] = cached_data
            logger.debug(f"🔥 Cache hit for stock {symbol}")
        else:
            uncached_symbols.append(symbol)

    # Fetch uncached symbols from API
    if uncached_symbols:
        logger.info(f"🔥 Cache miss for {len(uncached_symbols)} stocks, fetching from API...")
        fresh_data = get_stock_info(uncached_symbols)

        # Cache individual results with 5-minute TTL (300 seconds)
        for symbol, data in fresh_data.items():
            cache_key = f"stock_info:{symbol}"
            cache_instance.set(cache_key, data, ttl=300)  # 5 minutes
            results[symbol] = data
            logger.debug(f"🔥 Cached stock {symbol} for 5 minutes")

    return results


def get_cached_mutual_fund_nav(scheme_code: str):
    """
    Get mutual fund NAV with 1-hour caching.

    Args:
        scheme_code: Mutual fund scheme code

    Returns:
        Dict with NAV data or None
    """
    cache_key = f"mf_nav:{scheme_code}"
    cached_data = cache_instance.get(cache_key)

    if cached_data is not None:
        logger.debug(f"🔥 Cache hit for MF {scheme_code}")
        return cached_data

    logger.info(f"🔥 Cache miss for MF {scheme_code}, fetching from CSV...")
    data = get_mutual_fund_nav(scheme_code)

    if data:
        cache_instance.set(cache_key, data, ttl=3600)  # 1 hour
        logger.debug(f"🔥 Cached MF {scheme_code} for 1 hour")

    return data

# ==================== DATABASE DEPENDENCY ====================

async def get_db():
    """Dependency to check database availability"""
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database connection unavailable. Please check MongoDB configuration."
        )
    return db

# ==================== AUTH DEPENDENCY ====================

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session_token: Optional[str] = Cookie(None)
) -> Optional[User]:
    """Get current user from session token (cookie or header)"""
    if db is None:
        logger.error("Database not available for authentication")
        return None

    token = None

    # Check cookie first, then Authorization header
    if session_token:
        token = session_token
    elif credentials:
        token = credentials.credentials

    if not token:
        return None

    # Check session in database
    session = await db.user_sessions.find_one({
        "session_token": token,
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })

    if not session:
        return None

    # Get user
    user_doc = await db.users.find_one({"_id": session["user_id"]})
    if not user_doc:
        return None

    user_doc["id"] = user_doc.pop("_id")

    # Convert datetime to string if needed
    if "created_at" in user_doc and isinstance(user_doc["created_at"], datetime):
        user_doc["created_at"] = user_doc["created_at"].isoformat()

    return User(**user_doc)

async def require_auth(current_user: Optional[User] = Depends(get_current_user)) -> User:
    """Require authentication"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

# ==================== MODELS ====================

class StockBasic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    symbol: str
    name: str
    exchange: str
    sector: str

class StockDetail(BaseModel):
    model_config = ConfigDict(extra="ignore")
    symbol: str
    name: str
    exchange: str
    sector: str
    current_price: float
    change: float
    change_percent: float
    volume: int
    market_cap: float
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    roe: Optional[float] = None
    debt_to_equity: Optional[float] = None
    dividend_yield: Optional[float] = None
    week_52_high: float
    week_52_low: float
    rsi: Optional[float] = None
    ma_50: Optional[float] = None
    ma_200: Optional[float] = None

class HistoricalData(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class PortfolioHolding(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    
    # Stock fields
    symbol: Optional[str] = None
    name: Optional[str] = None
    
    # Mutual fund fields
    scheme_code: Optional[str] = None
    scheme_name: Optional[str] = None
    
    # Common fields
    quantity: int
    purchase_price: float
    purchase_date: str
    asset_type: str = "STOCK"
    current_price: Optional[float] = 0.0

class PortfolioHoldingCreate(BaseModel):
    # Stock fields
    symbol: Optional[str] = None
    name: Optional[str] = None
    
    # Mutual fund fields
    scheme_code: Optional[str] = None
    scheme_name: Optional[str] = None
    
    # Common fields
    quantity: int
    purchase_price: float
    purchase_date: str
    asset_type: Optional[str] = "STOCK" # Changed to Optional with default

class HoldingTransaction(BaseModel):
    quantity: int
    price: float
    transaction_date: str
    transaction_type: str # 'buy' or 'sell'

from fastapi import UploadFile, File

@api_router.post("/portfolio/upload")
async def upload_portfolio(file: UploadFile = File(...), current_user: User = Depends(require_auth)):
    """Upload a portfolio from a CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV.")

    content = await file.read()
    stream = io.StringIO(content.decode("utf-8"))
    df = pd.read_csv(stream)

    added_count = 0
    skipped_count = 0
    failed_count = 0

    for _, row in df.iterrows():
        try:
            symbol = row.get('symbol')
            scheme_code = row.get('scheme_code')
            asset_symbol = symbol if pd.notna(symbol) else scheme_code

            if pd.isna(asset_symbol):
                failed_count += 1
                continue

            # Check if holding already exists
            existing_holding = await db.portfolio.find_one({
                "user_id": current_user.id,
                "$or": [
                    {"symbol": asset_symbol},
                    {"scheme_code": asset_symbol}
                ]
            })

            if existing_holding:
                skipped_count += 1
                continue

            # Create new holding
            holding_data = {
                "id": str(uuid.uuid4()),
                "user_id": current_user.id,
                "symbol": symbol if pd.notna(symbol) else None,
                "name": row.get('name') if pd.notna(row.get('name')) else asset_symbol,
                "quantity": int(row.get('quantity')),
                "purchase_price": float(row.get('purchase_price')),
                "purchase_date": row.get('purchase_date'),
                "asset_type": row.get('asset_type', 'STOCK'),
                "scheme_code": scheme_code if pd.notna(scheme_code) else None,
                "scheme_name": row.get('scheme_name') if pd.notna(row.get('scheme_name')) else None,
            }
            await db.portfolio.insert_one(holding_data)

            # Create corresponding buy transaction
            transaction_doc = {
                "id": str(uuid.uuid4()),
                "user_id": current_user.id,
                "symbol": asset_symbol,
                "name": holding_data['name'],
                "transaction_type": "buy",
                "quantity": holding_data['quantity'],
                "price": holding_data['purchase_price'],
                "total_amount": holding_data['quantity'] * holding_data['purchase_price'],
                "transaction_date": holding_data['purchase_date'],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.transactions.insert_one(transaction_doc)
            added_count += 1

        except Exception as e:
            failed_count += 1
            logger.error(f"Failed to process portfolio row. Error: {e}")

    return {
        "message": "Portfolio upload processed.",
        "added": added_count,
        "skipped": skipped_count,
        "failed": failed_count
    }

@api_router.get("/portfolio/download")
async def download_portfolio(current_user: User = Depends(require_auth)):
    """Download user's portfolio as a CSV file"""
    holdings = await db.portfolio.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    if not holdings:
        raise HTTPException(status_code=404, detail="No holdings to download")

    df = pd.DataFrame(holdings)
    # Select and reorder columns for the CSV
    columns = ['symbol', 'name', 'quantity', 'purchase_price', 'purchase_date', 'asset_type', 'scheme_code', 'scheme_name']
    df = df[[col for col in columns if col in df.columns]]

    stream = io.StringIO()
    df.to_csv(stream, index=False)
    
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=portfolio.csv"
    return response


# === PATCH START: REPLACE LINES 207-218 WITH THIS CODE ===
class WatchlistItem(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    id: str = Field(alias="_id", default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    symbol: str
    name: str
    
    # ⭐ CRITICAL FIX: Make asset_type Optional ⭐
    # Old MongoDB documents might not have this, causing the ResponseValidationError
    asset_type: Optional[str] = None
    
    # DYNAMIC FIELDS (To ensure prices are sent)
    current_price: Optional[float] = None
    current_nav: Optional[float] = None
    change_percent: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
from typing import Optional

class WatchlistItemCreate(BaseModel):
    symbol: str
    name: str
    asset_type: Optional[str] = "STOCK" # Changed to optional with default
    
    # Optional fields for Mutual Funds if your client sends them during creation
    scheme_code: Optional[str] = None
    scheme_name: Optional[str] = None
# === PATCH END ===

class Strategy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: str
    criteria: Dict[str, Any]
    created_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StrategyCreate(BaseModel):
    name: str
    description: str
    criteria: Dict[str, Any]

class MarketIndex(BaseModel):
    name: str
    value: float
    change: float
    change_percent: float

# ==================== TRANSACTION & TAX MODELS ====================

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    symbol: str
    name: str
    transaction_type: str  # "buy" or "sell"
    quantity: int
    price: float
    total_amount: float
    transaction_date: str
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TransactionCreate(BaseModel):
    symbol: str
    name: str
    transaction_type: str
    quantity: int
    price: float
    transaction_date: str
    notes: Optional[str] = None

class PriceAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    symbol: str
    name: str
    alert_type: str  # "price_above", "price_below", "percent_change"
    target_value: float
    is_active: bool = True
    triggered: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PriceAlertCreate(BaseModel):
    symbol: str
    name: str
    alert_type: str
    target_value: float

class PriceAlertUpdate(BaseModel):
    is_active: Optional[bool] = None


class DividendRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    symbol: str
    name: str
    dividend_per_share: float
    quantity: int
    total_dividend: float
    ex_date: str
    payment_date: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DividendRecordCreate(BaseModel):
    symbol: str
    name: str
    dividend_per_share: float
    quantity: int
    ex_date: str
    payment_date: str

@api_router.get("/debug/stock-info/{symbol}")
async def debug_stock_info(symbol: str):
    """Temporary endpoint to debug get_stock_info for a specific symbol."""
    logger.info(f"Debugging stock info for symbol: {symbol}")
    stock_data = get_cached_stock_info(symbol)
    if not stock_data:
        raise HTTPException(status_code=404, detail=f"No stock data found for {symbol}")
    return stock_data

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Investment Framework API"}

# ==================== AUTH ENDPOINTS ====================

@api_router.options("/auth/register")
async def register_options():
    """Handle CORS preflight for register"""
    return Response(status_code=200)

@api_router.post("/auth/register", response_model=Token)
@limiter.limit("5/minute")
async def register(user_data: UserRegister, response: Response, request: Request):
    """Register new user with email/password"""
    # Validate disclaimer acceptance
    if not user_data.disclaimer_accepted:
        raise HTTPException(
            status_code=400,
            detail="You must accept the Investment Disclaimer to register"
        )

    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user with disclaimer acceptance
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=get_password_hash(user_data.password),
        auth_provider="email",
        disclaimer_accepted=True,
        disclaimer_accepted_at=datetime.now(timezone.utc).isoformat(),
        disclaimer_version="1.0"
    )
    
    user_dict = user.model_dump(by_alias=True)
    await db.users.insert_one(user_dict)
    
    # Create session
    session_token = str(uuid.uuid4())
    session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    )
    await db.user_sessions.insert_one(session.model_dump())
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    return Token(
        access_token=session_token,
        token_type="bearer",
        user=UserPublic(**user.model_dump())
    )

@api_router.options("/auth/login")
async def login_options():
    return Response(status_code=200)

@api_router.post("/auth/login", response_model=Token)
@limiter.limit("10/minute")
async def login(user_data: UserLogin, response: Response, request: Request):
    """Login with email/password"""
    logger.info(f"Login attempt for email: {user_data.email}")
    # Find user
    user_doc = await db.users.find_one({"email": user_data.email})
    if not user_doc:
        logger.warning(f"Login failed: User not found for email: {user_data.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_doc["id"] = user_doc.pop("_id")
    user = User(**user_doc)
    
    # Verify password
    password_verified = verify_password(user_data.password, user.password_hash)
    logger.info(f"Password verification result for {user_data.email}: {password_verified}")
    if not user.password_hash or not password_verified:
        logger.warning(f"Login failed: Invalid password for email: {user_data.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = str(uuid.uuid4())
    session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    )
    await db.user_sessions.insert_one(session.model_dump())
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    return Token(
        access_token=session_token,
        token_type="bearer",
        user=UserPublic(**user.model_dump())
    )

@api_router.post("/auth/google")
async def google_auth_callback(session_id: str = Query(...), response: Response = None):
    """Process Google OAuth session ID from Emergent Auth"""
    logger.info(f"Processing Google OAuth callback with session_id: {session_id[:20]}...")
    
    # Call Emergent auth service to get session data
    try:
        auth_response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=10
        )
        auth_response.raise_for_status()
        session_data = auth_response.json()
        logger.info(f"Google OAuth successful for user: {session_data.get('email')}")
    except requests.exceptions.Timeout:
        logger.error("Google OAuth service timeout")
        raise HTTPException(status_code=504, detail="Authentication service temporarily unavailable")
    except requests.exceptions.HTTPError as e:
        logger.error(f"Google OAuth HTTP error: {e.response.status_code}")
        raise HTTPException(status_code=400, detail="Invalid session ID")
    except requests.exceptions.RequestException as e:
        logger.error(f"Google OAuth connection failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    except (KeyError, ValueError) as e:
        logger.error(f"Invalid OAuth response format: {str(e)}")
        raise HTTPException(status_code=500, detail="Authentication error")
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": session_data["email"]})
    
    if user_doc:
        user_doc["id"] = user_doc.pop("_id")
        # Convert datetime to string if needed
        if "created_at" in user_doc and isinstance(user_doc["created_at"], datetime):
            user_doc["created_at"] = user_doc["created_at"].isoformat()
        user = User(**user_doc)
    else:
        # Create new user
        user = User(
            email=session_data["email"],
            name=session_data["name"],
            picture=session_data.get("picture"),
            auth_provider="google"
        )
        user_dict = user.model_dump(by_alias=True)
        await db.users.insert_one(user_dict)
    
    # Create session with token from Emergent
    session_token = session_data["session_token"]
    session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    )
    await db.user_sessions.insert_one(session.model_dump())
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    return Token(
        access_token=session_token,
        token_type="bearer",
        user=UserPublic(**user.model_dump())
    )

@api_router.get("/auth/me", response_model=UserPublic)
async def get_me(current_user: User = Depends(require_auth)):
    """Get current user info"""
    return UserPublic(**current_user.model_dump())

@api_router.post("/auth/logout")
async def logout(response: Response, current_user: User = Depends(require_auth), session_token: Optional[str] = Cookie(None)):
    """Logout user"""
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

class UserUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    country_code: Optional[str] = None
    country: Optional[str] = None
    date_of_birth: Optional[str] = None
    default_currency: Optional[str] = None


@api_router.put("/users/me", response_model=UserPublic)
async def update_me(user_update: UserUpdate, current_user: User = Depends(require_auth)):
    """Update current user's name and mobile"""
    logger.info(f"Updating user: {current_user.id}")
    update_data = user_update.model_dump(exclude_unset=True)
    
    if update_data:
        await db.users.update_one({"_id": current_user.id}, {"$set": update_data})
    
    updated_user_doc = await db.users.find_one({"_id": current_user.id})
    updated_user_doc["id"] = updated_user_doc.pop("_id")
    
    return UserPublic(**updated_user_doc)

class PasswordChange(BaseModel):
    password: str

@api_router.post("/users/me/change-password")
async def change_password(password_change: PasswordChange, current_user: User = Depends(require_auth)):
    """Change current user's password"""
    new_password_hash = get_password_hash(password_change.password)
    await db.users.update_one(
        {"_id": current_user.id},
        {"$set": {"password_hash": new_password_hash}}
    )
    return {"message": "Password changed successfully"}

# ---------- DYNAMIC / AUTO-POPULATING STOCK SEARCH ----------
import asyncio
import yfinance as yf
from datetime import datetime

async def get_all_stocks_from_db():
    """Helper to get all stocks from the database."""
    stocks = await db.stocks.find({}, {"_id": 0, "symbol": 1, "name": 1, "exchange": 1, "sector": 1}).to_list(10000)
    return stocks

@api_router.get("/stocks/search")
async def search_stocks(q: str = Query(..., min_length=1), exchange: Optional[str] = Query(None)):
    """
    Dynamic stock search:
    - Checks DB first
    - Falls back to local basic list
    - If not found, fetches from Yahoo Finance and auto-inserts into MongoDB
    - Supports optional exchange filtering for more precise results.
    """
    q_raw = q.strip()
    q_upper = q_raw.upper()

    # 1️⃣ Try database first
    try:
        db_query_symbols = [q_upper]
        if exchange == "NSE":
            db_query_symbols.append(q_upper + ".NS")
        elif exchange == "BSE":
            db_query_symbols.append(q_upper + ".BO")
        elif not exchange: # If no exchange specified, try common Indian suffixes
            db_query_symbols.extend([q_upper + ".NS", q_upper + ".BO"])

        doc = await db.stocks.find_one({"symbol": {"$in": db_query_symbols}})
        if doc:
            stock_basic = {
                "symbol": doc.get("symbol"),
                "name": doc.get("name", ""),
                "exchange": doc.get("exchange", "N/A"), # Default to N/A if not found
                "sector": doc.get("sector", "")
            }
            return [StockBasic(**stock_basic)]
    except Exception as e:
        logger.warning(f"DB lookup error: {e}")

    # 2️⃣ Try local CSV cache (nse_stocks_with_sectors.csv) for fuzzy matches
    try:
        csv_results = search_equities(q_raw, limit=10)
        if csv_results:
            if exchange:
                csv_results = [s for s in csv_results if s.get("exchange", "").upper() == exchange.upper()]
            if csv_results:
                return [StockBasic(**s) for s in csv_results]
    except Exception as e:
        logger.warning(f"search_equities() error: {e}")

    # 3️⃣ Try MongoDB fuzzy matches
    try:
        all_stocks = await get_all_stocks_from_db() or []
        q_lower = q_raw.lower()
        fuzzy = [
            StockBasic(**stock)
            for stock in all_stocks
            if (q_lower in stock.get("symbol", "").lower() or q_lower in stock.get("name", "").lower())
            and (not exchange or stock.get("exchange", "").upper() == exchange.upper())
        ]
        if fuzzy:
            return fuzzy[:10]
    except Exception as e:
        logger.warning(f"get_all_stocks_from_db() error: {e}")

    # 4️⃣ Live lookup from Yahoo Finance if not found
    yfinance_symbols_to_try = []

    # Prioritize exact symbol if exchange is specified
    if exchange:
        if exchange.upper() == "NSE" and not q_upper.endswith(".NS"):
            yfinance_symbols_to_try.append(q_upper + ".NS")
        elif exchange.upper() == "BSE" and not q_upper.endswith(".BO"):
            yfinance_symbols_to_try.append(q_upper + ".BO")
        elif exchange.upper() == "NASDAQ" or exchange.upper() == "NYSE":
            yfinance_symbols_to_try.append(q_upper) # Raw symbol for US exchanges
        else:
            yfinance_symbols_to_try.append(q_upper) # Fallback for other specified exchanges
    else:
        # If no exchange specified, try raw symbol first (for global stocks)
        yfinance_symbols_to_try.append(q_upper)
        # Then try common Indian suffixes
        if not q_upper.endswith(".NS"):
            yfinance_symbols_to_try.append(q_upper + ".NS")
        if not q_upper.endswith(".BO"):
            yfinance_symbols_to_try.append(q_upper + ".BO")
    
    # Remove duplicates and maintain order
    yfinance_symbols_to_try = list(dict.fromkeys(yfinance_symbols_to_try))

    for sym in yfinance_symbols_to_try:
        try:
            info = await asyncio.to_thread(lambda s=sym: getattr(yf.Ticker(s), "info", {}) or {})
            if info and ("longName" in info or "shortName" in info):
                name = info.get("longName") or info.get("shortName") or q_raw
                last_price = info.get("currentPrice") or info.get("regularMarketPrice")
                # Use exchange from yfinance info, or fallback to specified/default
                yf_exchange = info.get("exchange") or info.get("market")
                final_exchange = yf_exchange if yf_exchange else (exchange or "N/A")
                sector = info.get("sector") or ""

                stock_doc = {
                    "symbol": info.get("symbol", sym),
                    "name": name,
                    "exchange": final_exchange,
                    "sector": sector,
                    "last_price": last_price,
                    "meta": {"added_by": "auto", "created_at": datetime.utcnow()}
                }

                await db.stocks.update_one(
                    {"symbol": stock_doc["symbol"]},
                    {"$setOnInsert": stock_doc},
                    upsert=True
                )

                logger.info(f"✅ Added stock dynamically: {stock_doc['symbol']}")
                return [StockBasic(**stock_doc)]
        except Exception as e:
            logger.warning(f"yfinance lookup failed for {sym}: {e}")

    # 5️⃣ If nothing found
    return []
# ---------- END DYNAMIC SEARCH ----------

@api_router.get("/mutual-funds/search")
async def search_mutual_funds_api(q: str = Query(..., min_length=1)):
    """Search mutual funds by name or scheme code"""
    try:
        from mutual_fund_data import search_mutual_funds
        results = search_mutual_funds(q, limit=10)
        return {"results": results}
    except Exception as e:
        logger.error(f"Error searching mutual funds: {e}")
        return {"results": []}
@api_router.get("/mutualfunds/search")
async def search_mutualfunds_api(q: str = Query(..., min_length=1)):
    """Search mutual funds by name or scheme code"""
    try:
        from mutual_fund_data import search_mutual_funds
        results = search_mutual_funds(q, limit=10)
        return {"results": results}
    except Exception as e:
        logger.error(f"Error searching mutual funds: {e}")
        return {"results": []}   

@api_router.get("/stocks/all")
async def get_all_stocks():
    """Get all available stocks"""
    all_stocks = await get_all_stocks_from_db()
    return [StockBasic(**stock) for stock in all_stocks]

@api_router.get("/stocks/{symbol}", response_model=StockDetail)
async def get_stock_detail(symbol: str):
    """Get detailed stock information with real-time data"""
    stock_data = get_cached_stock_info(symbol)
    if not stock_data or symbol not in stock_data:
        raise HTTPException(status_code=404, detail="Stock not found")
    return StockDetail(**stock_data[symbol])

@api_router.get("/stocks/{symbol}/historical")
async def get_stock_historical(symbol: str, days: int = Query(90, ge=1, le=365)):
    """Get historical stock data"""
    hist_data = get_historical_data(symbol, days)
    if not hist_data:
        raise HTTPException(status_code=404, detail="No historical data available")
    return hist_data

@api_router.get("/mutualfunds/{scheme_code}")
async def get_mutual_fund_detail(scheme_code: str):
    """Get mutual fund details by scheme code"""
    try:
        # Get mutual fund NAV data
        mf_data = get_cached_mutual_fund_nav(scheme_code)
        
        if mf_data and mf_data.get('current_nav'):
            return {
                "symbol": scheme_code,
                "scheme_code": scheme_code,
                "name": mf_data.get('scheme_name', 'Unknown Fund'),
                "current_nav": mf_data['current_nav'],
                "current_price": mf_data['current_nav'],
                "change_percent": 0.0,
                "high": 0.0,
                "low": 0.0,
                "type": "mutual_fund"
            }
        
        raise HTTPException(status_code=404, detail=f"Mutual fund {scheme_code} not found")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching mutual fund {scheme_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/market/major-stocks")
@cached(key_prefix="major_stocks")
async def get_major_stocks():
    """Get real-time data for major world stocks."""
    stocks_data = get_major_world_stocks()
    return stocks_data

@api_router.get("/market/overview")
@cached(key_prefix="market_overview")
async def get_market_overview():
    """Get real-time market indices overview"""
    indices_data = get_market_indices()
    return [MarketIndex(**index) for index in indices_data]

@api_router.get("/screener")
async def screen_stocks(
    min_pe: Optional[float] = None,
    max_pe: Optional[float] = None,
    min_roe: Optional[float] = None,
    sector: Optional[str] = None
):
    """Screen stocks based on criteria with real-time data"""
    all_stocks = await get_all_stocks_from_db()
    
    # Apply sector filter
    if sector and sector != "All":
        all_stocks = [s for s in all_stocks if s["sector"].lower() == sector.lower()]
    
    results = []
    for stock_basic in all_stocks:
        # Get detailed real-time info
        stock_data_dict = get_cached_stock_info(stock_basic["symbol"])
        if not stock_data_dict:
            continue

        # Extract the inner dict (get_cached_stock_info returns {symbol: {data}})
        symbol = stock_basic["symbol"]
        if symbol not in stock_data_dict:
            continue
        stock_data = stock_data_dict[symbol]

        # Apply filters
        if min_pe and (not stock_data.get("pe_ratio") or stock_data["pe_ratio"] < min_pe):
            continue
        if max_pe and (not stock_data.get("pe_ratio") or stock_data["pe_ratio"] > max_pe):
            continue
        if min_roe and (not stock_data.get("roe") or stock_data["roe"] < min_roe):
            continue

        results.append(StockDetail(**stock_data))
    
    return results

# Portfolio endpoints
async def broadcast_stock_prices(stock_data: Dict[str, Dict]):
    for symbol, data in stock_data.items():
        await manager.broadcast({"type": "stock_price_update", "symbol": symbol, "price": data.get("current_price")})

@api_router.get("/portfolio", response_model=List[PortfolioHolding])
@cached(key_prefix="portfolio")
async def get_portfolio(current_user: User = Depends(require_auth)):
    holdings = await db.portfolio.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    stock_symbols = [h["symbol"] for h in holdings if h.get("asset_type") != "MUTUAL_FUND" and h.get("symbol")]
    mf_scheme_codes = [h["scheme_code"] for h in holdings if h.get("asset_type") == "MUTUAL_FUND" and h.get("scheme_code")]

    stock_data = {}
    if stock_symbols:
        stock_data = get_cached_stock_info(stock_symbols)
        await broadcast_stock_prices(stock_data)

    mf_data = {}
    if mf_scheme_codes:
        for code in mf_scheme_codes:
            nav_data = get_cached_mutual_fund_nav(code)
            if nav_data:
                mf_data[code] = nav_data

    # Get user's default currency
    user_currency = current_user.default_currency or "INR"
    exchange_rate = get_exchange_rate("INR", user_currency)

    # Update current prices with real-time data
    for holding in holdings:
        if holding.get("asset_type") == "MUTUAL_FUND":
            scheme_code = holding.get("scheme_code")
            if scheme_code in mf_data:
                holding["current_nav"] = float(Decimal(str(mf_data[scheme_code]['current_nav'])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
                holding["current_price"] = float(Decimal(str(mf_data[scheme_code]['current_nav'])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        else:
            symbol = holding.get("symbol")
            if symbol in stock_data:
                holding["current_price"] = float(Decimal(str(stock_data[symbol]["current_price"])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        
        # Convert to user's currency
        if exchange_rate:
            holding["purchase_price"] = holding["purchase_price"] * exchange_rate
            holding["current_price"] = holding["current_price"] * exchange_rate
    
    # Sort alphabetically by symbol or scheme_code
    holdings = sorted(holdings, key=lambda x: x.get("symbol") or x.get("scheme_code") or "")
    
    return holdings

@api_router.post("/portfolio", response_model=PortfolioHolding)
async def add_portfolio_holding(holding: PortfolioHoldingCreate, current_user: User = Depends(require_auth)):
    holding_obj = PortfolioHolding(**holding.model_dump(), user_id=current_user.id)
    
    # Get real-time current price
    current_price = 0
    # Handle optional asset_type - default to STOCK if None
    asset_type = holding.asset_type or "STOCK"
    
    if asset_type == "STOCK":
        stock_info = get_cached_stock_info(holding.symbol)
        if stock_info and holding.symbol in stock_info:
            current_price = stock_info[holding.symbol].get('current_price', 0)
    elif asset_type == "MUTUAL_FUND":
        mf_info = get_cached_mutual_fund_nav(holding.scheme_code)
        if mf_info:
            current_price = mf_info.get('current_nav', 0)

    if current_price > 0:
        holding_obj.current_price = current_price
    
    doc = holding_obj.model_dump()
    await db.portfolio.insert_one(doc)

    # Also create a buy transaction
    transaction_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "symbol": holding.symbol or holding.scheme_code,
        "name": holding.name or holding.scheme_name,
        "transaction_type": "buy",
        "quantity": holding.quantity,
        "price": holding.purchase_price,
        "total_amount": holding.quantity * holding.purchase_price,
        "transaction_date": holding.purchase_date,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    logger.info(f"Adding transaction with quantity: {holding.quantity}, price: {holding.purchase_price}, total_amount: {holding.quantity * holding.purchase_price}")
    await db.transactions.insert_one(transaction_doc)

    return holding_obj

@api_router.post("/portfolio/{holding_id}/transact")
async def transact_holding(holding_id: str, transaction: HoldingTransaction, current_user: User = Depends(require_auth)):
    holding = await db.portfolio.find_one({"id": holding_id, "user_id": current_user.id})
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    # Create a transaction record
    transaction_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "symbol": holding['symbol'] or holding['scheme_code'],
        "name": holding['name'] or holding['scheme_name'],
        "transaction_type": transaction.transaction_type,
        "quantity": transaction.quantity,
        "price": transaction.price,
        "total_amount": transaction.quantity * transaction.price,
        "transaction_date": transaction.transaction_date,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    logger.info(f"Adding transaction with quantity: {transaction.quantity}, price: {transaction.price}, total_amount: {transaction.quantity * transaction.price}")
    await db.transactions.insert_one(transaction_doc)

    if transaction.transaction_type == 'buy':
        new_quantity = holding['quantity'] + transaction.quantity
        new_total_cost = (holding['quantity'] * holding['purchase_price']) + (transaction.quantity * transaction.price)
        new_avg_price = new_total_cost / new_quantity
        
        await db.portfolio.update_one(
            {"id": holding_id, "user_id": current_user.id},
            {"$set": {"quantity": new_quantity, "purchase_price": new_avg_price}}
        )
    elif transaction.transaction_type == 'sell':
        new_quantity = holding['quantity'] - transaction.quantity
        if new_quantity < 0:
            raise HTTPException(status_code=400, detail="Cannot sell more than you own")
        
        if new_quantity == 0:
            await db.portfolio.delete_one({"id": holding_id, "user_id": current_user.id})
            return {"message": "Holding sold completely and removed from portfolio"}
        else:
            # Average price does not change on selling
            await db.portfolio.update_one(
                {"id": holding_id, "user_id": current_user.id},
                {"$set": {"quantity": new_quantity}}
            )
    
    return {"message": "Transaction recorded and portfolio updated"}

@api_router.options("/portfolio")
async def portfolio_options():
    return {}
@api_router.options("/portfolio/{holding_id}")
async def portfolio_delete_options(holding_id: str = None):
    return {}

@api_router.delete("/portfolio/{holding_id}")
async def delete_portfolio_holding(holding_id: str, current_user: User = Depends(require_auth)):
    result = await db.portfolio.delete_one({"id": holding_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Holding not found")
    return {"message": "Holding deleted successfully"}

@api_router.get("/portfolio/performance")
@cached(key_prefix="portfolio_performance")
async def get_portfolio_performance(current_user: User = Depends(require_auth)):
    holdings = await get_portfolio(current_user=current_user)
    
    total_invested = Decimal('0.00')
    total_current = Decimal('0.00')
    
    # Get user's default currency
    user_currency = current_user.default_currency or "INR"
    exchange_rate = get_exchange_rate("INR", user_currency)

    for holding in holdings:
        quantity = Decimal(str(holding["quantity"]))
        purchase_price = Decimal(str(holding["purchase_price"]))
        current_price_decimal = Decimal(str(holding.get("current_price", '0.00')))

        invested = quantity * purchase_price
        total_invested += invested
        logger.info(f"Holding {holding.get('symbol') or holding.get('scheme_code')}: invested_for_holding={invested}, running_total_invested={total_invested}")
        
        if current_price_decimal > 0:
            current = quantity * current_price_decimal
            total_current += current
            logger.info(f"Holding {holding.get('symbol') or holding.get('scheme_code')}: current_price={current_price_decimal}, current_value_for_holding={current}, running_total_current={total_current}")
        else:
            fallback_price = Decimal(str(holding.get("purchase_price")))
            current = quantity * fallback_price
            total_current += current
            logger.warning(f"Could not find current price for {holding.get('symbol') or holding.get('scheme_code')}, using fallback: {fallback_price}, current_value_for_holding={current}, running_total_current={total_current}")
    
    if exchange_rate:
        total_invested = total_invested * Decimal(exchange_rate)
        total_current = total_current * Decimal(exchange_rate)

    logger.info(f"Final total_current calculated: {total_current}")
    total_gain = total_current - total_invested
    
    total_invested_rounded = total_invested.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    total_current_rounded = total_current.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    total_gain_rounded = total_gain.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    total_gain_percent = Decimal('0.00')
    if total_invested_rounded > 0:
        total_gain_percent = (total_gain_rounded / total_invested_rounded * Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    return {
        "total_invested": float(total_invested_rounded),
        "total_current": float(total_current_rounded),
        "total_gain": float(total_gain_rounded),
        "total_gain_percent": float(total_gain_percent)
    }

# Watchlist endpoints
@api_router.get("/watchlist", response_model=List[WatchlistItem])
@cached(key_prefix="watchlist")
async def get_watchlist(current_user: User = Depends(require_auth)):
    items = await db.watchlist.find({"user_id": current_user.id}).to_list(1000)
    
    stock_symbols = [item["symbol"] for item in items if not item.get("symbol", "").isdigit()]
    mf_scheme_codes = [item["symbol"] for item in items if item.get("symbol", "").isdigit()]
    stock_data = {}
    if stock_symbols:
        logger.info(f"Fetching stock info for symbols: {stock_symbols}")
        stock_data = get_cached_stock_info(stock_symbols)
        logger.info(f"Received stock data: {stock_data}")
        await broadcast_stock_prices(stock_data)

    mf_data = {}
    if mf_scheme_codes:
        for code in mf_scheme_codes:
            nav_data = get_cached_mutual_fund_nav(code)
            if nav_data:
                mf_data[code] = nav_data

    # Enrich items with current prices
    for item in items:
        if "_id" in item:
            item["_id"] = str(item["_id"])
        
        symbol = item.get("symbol", "")
        is_mutual_fund = symbol.isdigit()
        
        if is_mutual_fund:
            if symbol in mf_data:
                item["current_nav"] = mf_data[symbol]['current_nav']
                item["current_price"] = mf_data[symbol]['current_nav']
                item["change_percent"] = 0
                item["high"] = 0
                item["low"] = 0
                item["name"] = mf_data[symbol].get("scheme_name", item.get("name", "Unknown Fund"))
        else:
            if symbol in stock_data:
                data = stock_data[symbol]
                item["current_price"] = data.get("current_price", 0)
                item["change_percent"] = data.get("change_percent", 0)
                item["high"] = data.get("week_52_high", 0)
                item["low"] = data.get("week_52_low", 0)

    # === NEW: JOIN with analytics ===
    analytics_collection = db['watchlist_analytics']
    
    for item in items:
        symbol = item.get('symbol', '')
        is_mutual_fund = symbol.isdigit()
        
        if not is_mutual_fund:
            try:
                analytics = await analytics_collection.find_one({
                    'user_id': current_user.id,
                    'symbol': symbol
                })
                
                if analytics and analytics.get('fetch_status') == 'success':
                    item['week_52_high'] = analytics.get('week_52_high')
                    item['week_52_low'] = analytics.get('week_52_low')
                    item['day_high'] = analytics.get('day_high')
                    item['day_low'] = analytics.get('day_low')
                    
            except Exception as e:
                logger.warning(f"Could not load analytics for {symbol}: {e}")
    
    return items

@api_router.options("/watchlist")
async def watchlist_options():
    return {}

@api_router.post("/watchlist", response_model=WatchlistItem)
async def add_watchlist_item(item: WatchlistItemCreate, current_user: User = Depends(require_auth)):
    logger.info(f"Received item for watchlist: {item.model_dump()}")
    item_obj = WatchlistItem(**item.model_dump(), user_id=current_user.id)
    doc = item_obj.model_dump()
    await db.watchlist.insert_one(doc)
    return item_obj

@api_router.options("/watchlist/{item_id}")
async def watchlist_delete_options(item_id: str = None):
    return {}

@api_router.delete("/watchlist/{item_id}")
async def delete_watchlist_item(item_id: str, current_user: User = Depends(require_auth)):
    result = await db.watchlist.delete_one({"id": item_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return {"message": "Item removed from watchlist"}

# Strategy endpoints
@api_router.get("/strategies", response_model=List[Strategy])
async def get_strategies(current_user: User = Depends(require_auth)):
    strategies = await db.strategies.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    return strategies

@api_router.post("/strategies", response_model=Strategy)
async def create_strategy(strategy: StrategyCreate, current_user: User = Depends(require_auth)):
    strategy_obj = Strategy(**strategy.model_dump(), user_id=current_user.id)
    doc = strategy_obj.model_dump()
    await db.strategies.insert_one(doc)
    return strategy_obj

@api_router.delete("/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str, current_user: User = Depends(require_auth)):
    result = await db.strategies.delete_one({"id": strategy_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {"message": "Strategy deleted successfully"}

# ==================== ANALYTICS ENDPOINTS ====================

@api_router.get("/analytics/portfolio")
async def get_portfolio_analytics(current_user: User = Depends(require_auth)):
    """Get comprehensive portfolio analytics"""
    holdings = await db.portfolio.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)

    stock_symbols = [h["symbol"] for h in holdings if h.get("asset_type") != "MUTUAL_FUND" and h.get("symbol")]
    stock_data = {}
    if stock_symbols:
        stock_data = get_cached_stock_info(stock_symbols)
        await broadcast_stock_prices(stock_data)

    # Update current prices in holdings
    for holding in holdings:
        if holding.get("asset_type") != "MUTUAL_FUND":
            symbol = holding.get("symbol")
            if symbol in stock_data:
                holding["current_price"] = stock_data[symbol].get("current_price", 0)
        else:
            mf_info = get_cached_mutual_fund_nav(holding.get("scheme_code"))
            if mf_info:
                holding["current_price"] = mf_info.get('current_nav', 0)

    analytics = calculate_portfolio_analytics(holdings, stock_data)
    return analytics

@api_router.post("/analytics/rebalance")
async def get_rebalancing_suggestions(
    target_allocation: Dict[str, float],
    current_user: User = Depends(require_auth)
):
    """Get portfolio rebalancing suggestions"""
    holdings = await db.portfolio.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)

    stock_symbols = [h["symbol"] for h in holdings if h.get("asset_type") != "MUTUAL_FUND" and h.get("symbol")]
    stock_data = {}
    if stock_symbols:
        stock_data = get_cached_stock_info(stock_symbols)
        await broadcast_stock_prices(stock_data)

    # Update current prices in holdings
    for holding in holdings:
        if holding.get("asset_type") != "MUTUAL_FUND":
            symbol = holding.get("symbol")
            if symbol in stock_data:
                holding["current_price"] = stock_data[symbol].get("current_price", 0)
        else:
            mf_info = get_cached_mutual_fund_nav(holding.get("scheme_code"))
            if mf_info:
                holding["current_price"] = mf_info.get('current_nav', 0)

    suggestions = calculate_rebalancing_suggestions(holdings, target_allocation, stock_data)
    return {"suggestions": suggestions}

@api_router.get("/analytics/recommendations")
async def get_stock_recommendations(
    strategy_id: Optional[str] = None,
    current_user: User = Depends(require_auth)
):
    """Get AI-powered stock recommendations"""
    # Get existing holdings
    holdings = await db.portfolio.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    existing_symbols = [h["symbol"] for h in holdings]
    
    # Get strategy criteria
    if strategy_id:
        strategy = await db.strategies.find_one({"id": strategy_id, "user_id": current_user.id}, {"_id": 0})
        if not strategy:
            raise HTTPException(status_code=404, detail="Strategy not found")
        criteria = strategy["criteria"]
    else:
        # Default criteria
        criteria = {"min_roe": 10, "max_pe": 30}
    
    # Get all stocks with full data
    all_stocks_basic = await get_all_stocks_from_db()
    all_stocks_detailed = []

    for stock_basic in all_stocks_basic[:30]:  # Limit to avoid timeout
        stock_detail_dict = get_cached_stock_info(stock_basic["symbol"])
        if stock_detail_dict:
            # Extract the inner dict (get_cached_stock_info returns {symbol: {data}})
            symbol = stock_basic["symbol"]
            if symbol in stock_detail_dict:
                all_stocks_detailed.append(stock_detail_dict[symbol])
    
    recommendations = generate_stock_recommendations(
        criteria, all_stocks_detailed, existing_symbols, limit=10
    )
    
    return {"recommendations": recommendations, "criteria": criteria}

# ==================== TRANSACTION ROUTES ====================

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(
    transaction: TransactionCreate,
    current_user: User = Depends(require_auth)
):
    """Create a new buy/sell transaction"""
    transaction_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "symbol": transaction.symbol,
        "name": transaction.name,
        "transaction_type": transaction.transaction_type,
        "quantity": transaction.quantity,
        "price": transaction.price,
        "total_amount": transaction.quantity * transaction.price,
        "transaction_date": transaction.transaction_date,
        "notes": transaction.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.transactions.insert_one(transaction_doc)
    return Transaction(**transaction_doc)

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    current_user: User = Depends(require_auth),
    symbol: Optional[str] = None
):
    """Get all transactions for the current user"""
    query = {"user_id": current_user.id}
    if symbol:
        query["symbol"] = symbol
    
    transactions = await db.transactions.find(query).sort("transaction_date", -1).to_list(length=None)
    return [Transaction(**t) for t in transactions]

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(require_auth)
):
    """Delete a transaction"""
    result = await db.transactions.delete_one({
        "id": transaction_id,
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return {"message": "Transaction deleted"}

@api_router.get("/transactions/summary")
async def get_transactions_summary(current_user: User = Depends(require_auth)):
    """Get comprehensive transaction summary with current portfolio value"""
    logger.info("🔥 NEW TRANSACTION SUMMARY ENDPOINT CALLED - FIXED CODE RUNNING!")
    # Get all transactions
    transactions = await db.transactions.find({"user_id": current_user.id}).to_list(length=None)

    total_bought = sum(t["total_amount"] for t in transactions if t["transaction_type"] == "buy")
    total_sold = sum(t["total_amount"] for t in transactions if t["transaction_type"] == "sell")
    net_invested = total_bought - total_sold

    # Get current portfolio value
    holdings = await db.portfolio.find({"user_id": current_user.id}).to_list(1000)

    current_value = 0
    portfolio_cost_basis = 0

    for holding in holdings:
        quantity = holding.get("quantity", 0)
        purchase_price = holding.get("purchase_price", 0)
        portfolio_cost_basis += quantity * purchase_price

        # Get current price
        current_price = 0
        if holding.get("asset_type") == "MUTUAL_FUND":
            mf_data = get_cached_mutual_fund_nav(holding.get("scheme_code"))
            if mf_data:
                current_price = mf_data.get("current_nav", 0)
        else:
            symbol = holding.get("symbol")
            if symbol:
                stock_data_dict = get_cached_stock_info(symbol)
                if stock_data_dict and symbol in stock_data_dict:
                    current_price = stock_data_dict[symbol].get("current_price", 0)

        current_value += quantity * current_price

    # Calculate P&L
    total_gain_loss = current_value - net_invested
    total_gain_loss_percent = (total_gain_loss / net_invested * 100) if net_invested > 0 else 0

    # Check for mismatch
    mismatch = portfolio_cost_basis - net_invested
    has_mismatch = abs(mismatch) > 1  # Allow ₹1 rounding difference

    return {
        "total_bought": round(total_bought, 2),
        "total_sold": round(total_sold, 2),
        "net_invested": round(net_invested, 2),
        "current_value": round(current_value, 2),
        "total_gain_loss": round(total_gain_loss, 2),
        "total_gain_loss_percent": round(total_gain_loss_percent, 2),
        "portfolio_cost_basis": round(portfolio_cost_basis, 2),
        "mismatch": round(mismatch, 2),
        "has_mismatch": has_mismatch,
        "num_holdings": len(holdings),
        "num_transactions": len(transactions)
    }

@api_router.get("/transactions/diagnostic")
async def diagnose_transaction_mismatch(current_user: User = Depends(require_auth)):
    """Diagnose mismatches between portfolio and transactions"""
    # Get portfolio holdings
    holdings = await db.portfolio.find({"user_id": current_user.id}).to_list(1000)

    # Get all transactions
    transactions = await db.transactions.find({"user_id": current_user.id}).to_list(length=None)

    # Calculate portfolio cost basis
    portfolio_items = []
    total_portfolio_cost = 0

    for holding in holdings:
        quantity = holding.get("quantity", 0)
        purchase_price = holding.get("purchase_price", 0)
        cost = quantity * purchase_price
        total_portfolio_cost += cost

        symbol = holding.get("symbol") or holding.get("scheme_code")
        name = holding.get("name") or holding.get("scheme_name")

        portfolio_items.append({
            "symbol": symbol,
            "name": name,
            "quantity": quantity,
            "purchase_price": purchase_price,
            "total_cost": round(cost, 2),
            "asset_type": holding.get("asset_type", "STOCK")
        })

    # Calculate transaction totals
    total_bought = sum(t["total_amount"] for t in transactions if t["transaction_type"] == "buy")
    total_sold = sum(t["total_amount"] for t in transactions if t["transaction_type"] == "sell")
    net_from_transactions = total_bought - total_sold

    # Find mismatch
    mismatch = total_portfolio_cost - net_from_transactions

    # Group transactions by symbol
    transaction_summary = {}
    for txn in transactions:
        symbol = txn["symbol"]
        if symbol not in transaction_summary:
            transaction_summary[symbol] = {"bought": 0, "sold": 0, "net": 0}

        if txn["transaction_type"] == "buy":
            transaction_summary[symbol]["bought"] += txn["total_amount"]
            transaction_summary[symbol]["net"] += txn["total_amount"]
        else:
            transaction_summary[symbol]["sold"] += txn["total_amount"]
            transaction_summary[symbol]["net"] -= txn["total_amount"]

    # Find holdings without transactions
    missing_transactions = []
    for item in portfolio_items:
        if item["symbol"] not in transaction_summary:
            missing_transactions.append({
                "symbol": item["symbol"],
                "name": item["name"],
                "quantity": item["quantity"],
                "purchase_price": item["purchase_price"],
                "missing_amount": item["total_cost"],
                "reason": "No buy transaction found for this holding"
            })

    return {
        "summary": {
            "total_portfolio_cost_basis": round(total_portfolio_cost, 2),
            "total_bought_from_transactions": round(total_bought, 2),
            "total_sold_from_transactions": round(total_sold, 2),
            "net_from_transactions": round(net_from_transactions, 2),
            "mismatch": round(mismatch, 2),
            "has_mismatch": abs(mismatch) > 1
        },
        "portfolio_items": portfolio_items,
        "transaction_summary": transaction_summary,
        "missing_transactions": missing_transactions,
        "diagnosis": "Data is in sync" if abs(mismatch) <= 1 else f"Mismatch of ₹{abs(mismatch):.2f} detected. {len(missing_transactions)} holdings have no corresponding transactions."
    }

@api_router.post("/transactions/sync")
async def sync_transactions_with_portfolio(current_user: User = Depends(require_auth)):
    """Auto-sync: Create missing transactions for portfolio holdings"""
    logger.info(f"Sync requested by user {current_user.id}")

    # Get portfolio holdings
    holdings = await db.portfolio.find({"user_id": current_user.id}).to_list(1000)
    logger.info(f"Found {len(holdings)} portfolio holdings")

    # Get existing transactions
    transactions = await db.transactions.find({"user_id": current_user.id}).to_list(length=None)
    logger.info(f"Found {len(transactions)} existing transactions")

    # Find symbols with transactions
    symbols_with_transactions = set(t["symbol"] for t in transactions)
    logger.info(f"Symbols with existing transactions: {symbols_with_transactions}")

    # Create missing transactions
    created_transactions = []

    for holding in holdings:
        symbol = holding.get("symbol") or holding.get("scheme_code")
        name = holding.get("name") or holding.get("scheme_name")

        logger.info(f"Checking holding: {symbol} ({name})")

        if symbol not in symbols_with_transactions:
            # Create a buy transaction for this holding
            transaction_doc = {
                "id": str(uuid.uuid4()),
                "user_id": current_user.id,
                "symbol": symbol,
                "name": name,
                "transaction_type": "buy",
                "quantity": holding.get("quantity", 0),
                "price": holding.get("purchase_price", 0),
                "total_amount": holding.get("quantity", 0) * holding.get("purchase_price", 0),
                "transaction_date": holding.get("purchase_date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "note": "Auto-synced from portfolio"
            }

            await db.transactions.insert_one(transaction_doc)
            created_transactions.append({
                "symbol": symbol,
                "name": name,
                "amount": transaction_doc["total_amount"]
            })

            logger.info(f"✓ Auto-created transaction for {symbol}: qty={transaction_doc['quantity']}, price={transaction_doc['price']}, total=₹{transaction_doc['total_amount']}")
        else:
            logger.info(f"✗ Skipping {symbol} - already has transactions")

    logger.info(f"Sync complete: Created {len(created_transactions)} transactions totaling ₹{sum(t['amount'] for t in created_transactions)}")

    return {
        "message": "Sync completed successfully",
        "created_count": len(created_transactions),
        "created_transactions": created_transactions,
        "total_synced_amount": round(sum(t["amount"] for t in created_transactions), 2)
    }

@api_router.get("/tax-report")
async def get_tax_report(
    current_user: User = Depends(require_auth),
    financial_year: Optional[str] = None
):
    """Generate tax report with capital gains"""
    # Get all transactions
    transactions = await db.transactions.find({
        "user_id": current_user.id
    }).sort("transaction_date", 1).to_list(length=None)
    
    # Calculate capital gains using FIFO method
    holdings_tracker = {}  # symbol -> [(quantity, buy_price, buy_date)]
    capital_gains = {
        "short_term": [],  # < 1 year
        "long_term": []    # >= 1 year
    }
    
    for txn in transactions:
        symbol = txn["symbol"]
        
        if txn["transaction_type"] == "buy":
            if symbol not in holdings_tracker:
                holdings_tracker[symbol] = []
            holdings_tracker[symbol].append({
                "quantity": txn["quantity"],
                "price": txn["price"],
                "date": txn["transaction_date"]
            })
        
        elif txn["transaction_type"] == "sell":
            if symbol not in holdings_tracker or not holdings_tracker[symbol]:
                continue
            
            remaining_to_sell = txn["quantity"]
            sell_price = txn["price"]
            sell_date = datetime.fromisoformat(txn["transaction_date"])
            
            while remaining_to_sell > 0 and holdings_tracker[symbol]:
                buy_lot = holdings_tracker[symbol][0]
                buy_date = datetime.fromisoformat(buy_lot["date"])
                holding_period = (sell_date - buy_date).days
                
                quantity_to_process = min(remaining_to_sell, buy_lot["quantity"])
                
                cost_basis = quantity_to_process * buy_lot["price"]
                sale_proceeds = quantity_to_process * sell_price
                gain = sale_proceeds - cost_basis
                
                gain_record = {
                    "symbol": symbol,
                    "name": txn["name"],
                    "quantity": quantity_to_process,
                    "buy_price": buy_lot["price"],
                    "sell_price": sell_price,
                    "buy_date": buy_lot["date"],
                    "sell_date": txn["transaction_date"],
                    "holding_days": holding_period,
                    "cost_basis": cost_basis,
                    "sale_proceeds": sale_proceeds,
                    "gain_loss": gain
                }
                
                if holding_period < 365:
                    capital_gains["short_term"].append(gain_record)
                else:
                    capital_gains["long_term"].append(gain_record)
                
                buy_lot["quantity"] -= quantity_to_process
                remaining_to_sell -= quantity_to_process
                
                if buy_lot["quantity"] <= 0:
                    holdings_tracker[symbol].pop(0)
    
    # Calculate tax
    stcg_total = sum(g["gain_loss"] for g in capital_gains["short_term"])
    ltcg_total = sum(g["gain_loss"] for g in capital_gains["long_term"])
    
    # Indian tax rates
    stcg_tax = max(0, stcg_total * 0.15)  # 15% STCG
    ltcg_exemption = 100000  # ₹1 lakh exemption
    ltcg_taxable = max(0, ltcg_total - ltcg_exemption)
    ltcg_tax = ltcg_taxable * 0.10  # 10% LTCG above exemption
    
    total_tax = stcg_tax + ltcg_tax
    
    # Get unrealized gains from current portfolio
    portfolio = await db.portfolio.find({"user_id": current_user.id}).to_list(length=None)
    unrealized_gains = []
    unrealized_total = 0
    
    for holding in portfolio:
        try:
            current_price = 0
            if holding.get("asset_type") == "MUTUAL_FUND":
                mf_data = get_cached_mutual_fund_nav(holding.get("scheme_code"))
                if mf_data:
                    current_price = mf_data.get('current_nav', 0)
            else:
                symbol = holding.get("symbol")
                stock_data = get_cached_stock_info(symbol)
                if stock_data and symbol in stock_data:
                    current_price = stock_data[symbol].get("current_price", 0)
            
            # Calculate average cost from transactions
            buy_transactions = [t for t in transactions 
                              if t["symbol"] == holding["symbol"] 
                              and t["transaction_type"] == "buy"]
            
            if buy_transactions:
                total_cost = sum(t["total_amount"] for t in buy_transactions)
                total_qty = sum(t["quantity"] for t in buy_transactions)
                avg_cost = total_cost / total_qty if total_qty > 0 else 0
                
                current_value = holding["quantity"] * current_price
                cost_basis = holding["quantity"] * avg_cost
                unrealized_gain = current_value - cost_basis
                
                unrealized_gains.append({
                    "symbol": holding["symbol"],
                    "name": holding["name"],
                    "quantity": holding["quantity"],
                    "avg_cost": avg_cost,
                    "current_price": current_price,
                    "cost_basis": cost_basis,
                    "current_value": current_value,
                    "unrealized_gain": unrealized_gain,
                    "gain_percent": (unrealized_gain / cost_basis * 100) if cost_basis > 0 else 0
                })
                unrealized_total += unrealized_gain
        except Exception as e:
            logger.error(f"Error calculating unrealized gain for {holding['symbol']}: {e}")
    
    return {
        "capital_gains": capital_gains,
        "summary": {
            "short_term_gain": stcg_total,
            "long_term_gain": ltcg_total,
            "stcg_tax": stcg_tax,
            "ltcg_tax": ltcg_tax,
            "total_realized_gain": stcg_total + ltcg_total,
            "total_tax_liability": total_tax,
            "ltcg_exemption_used": min(ltcg_total, ltcg_exemption)
        },
        "unrealized": {
            "holdings": unrealized_gains,
            "total_unrealized_gain": unrealized_total
        }
    }

# ==================== PRICE ALERT ROUTES ====================

@api_router.post("/alerts", response_model=PriceAlert)
async def create_alert(
    alert: PriceAlertCreate,
    current_user: User = Depends(require_auth)
):
    """Create a new price alert"""
    alert_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "symbol": alert.symbol,
        "name": alert.name,
        "alert_type": alert.alert_type,
        "target_value": alert.target_value,
        "is_active": True,
        "triggered": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.price_alerts.insert_one(alert_doc)
    return PriceAlert(**alert_doc)

@api_router.get("/alerts", response_model=List[PriceAlert])
async def get_alerts(
    current_user: User = Depends(require_auth)
):
    """Get all price alerts for the current user"""
    alerts = await db.price_alerts.find({
        "user_id": current_user.id
    }).sort("created_at", -1).to_list(length=None)
    return [PriceAlert(**a) for a in alerts]

@api_router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: str,
    current_user: User = Depends(require_auth)
):
    """Delete a price alert"""
    result = await db.price_alerts.delete_one({
        "id": alert_id,
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"message": "Alert deleted"}

@api_router.put("/alerts/{alert_id}", response_model=PriceAlert)
async def update_alert(
    alert_id: str,
    alert_update: PriceAlertUpdate,
    current_user: User = Depends(require_auth)
):
    """Update a price alert, e.g., to toggle its active status"""
    update_data = alert_update.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    result = await db.price_alerts.update_one(
        {"id": alert_id, "user_id": current_user.id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")

    updated_alert = await db.price_alerts.find_one({"id": alert_id, "user_id": current_user.id})
    
    return PriceAlert(**updated_alert)

@api_router.get("/alerts/check")
async def check_alerts(
    current_user: User = Depends(require_auth)
):
    """Check if any alerts have been triggered"""
    alerts = await db.price_alerts.find({
        "user_id": current_user.id,
        "is_active": True,
        "triggered": False
    }).to_list(length=None)
    
    triggered_alerts = []
    
    for alert in alerts:
        try:
            symbol = alert["symbol"]
            stock_data = get_cached_stock_info(symbol)
            current_price = 0
            if stock_data and symbol in stock_data:
                current_price = stock_data[symbol].get("current_price", 0)
            
            should_trigger = False
            
            if alert["alert_type"] == "price_above" and current_price >= alert["target_value"]:
                should_trigger = True
            elif alert["alert_type"] == "price_below" and current_price <= alert["target_value"]:
                should_trigger = True
            
            if should_trigger:
                await db.price_alerts.update_one(
                    {"id": alert["id"]},
                    {"$set": {"triggered": True}}
                )
                triggered_alerts.append({
                    "id": alert["id"],
                    "symbol": alert["symbol"],
                    "name": alert["name"],
                    "alert_type": alert["alert_type"],
                    "target_value": alert["target_value"],
                    "current_price": current_price
                })
        except Exception as e:
            logger.error(f"Error checking alert for {alert['symbol']}: {e}")
    
    return {"triggered_alerts": triggered_alerts}

# ==================== DIVIDEND ROUTES ====================

@api_router.post("/dividends", response_model=DividendRecord)
async def create_dividend_record(
    dividend: DividendRecordCreate,
    current_user: User = Depends(require_auth)
):
    """Record a dividend payment"""
    dividend_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "symbol": dividend.symbol,
        "name": dividend.name,
        "dividend_per_share": dividend.dividend_per_share,
        "quantity": dividend.quantity,
        "total_dividend": dividend.dividend_per_share * dividend.quantity,
        "ex_date": dividend.ex_date,
        "payment_date": dividend.payment_date,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.dividends.insert_one(dividend_doc)
    return DividendRecord(**dividend_doc)

@api_router.get("/dividends", response_model=List[DividendRecord])
async def get_dividends(
    current_user: User = Depends(require_auth),
    symbol: Optional[str] = None
):
    """Get all dividend records"""
    query = {"user_id": current_user.id}
    if symbol:
        query["symbol"] = symbol
    
    dividends = await db.dividends.find(query).sort("payment_date", -1).to_list(length=None)
    return [DividendRecord(**d) for d in dividends]

@api_router.get("/dividends/summary")
async def get_dividend_summary(
    current_user: User = Depends(require_auth)
):
    """Get dividend summary and analytics"""
    dividends = await db.dividends.find({
        "user_id": current_user.id
    }).to_list(length=None)
    
    total_income = sum(d["total_dividend"] for d in dividends)
    
    # Group by year
    by_year = {}
    for d in dividends:
        year = d["payment_date"][:4]
        if year not in by_year:
            by_year[year] = 0
        by_year[year] += d["total_dividend"]
    
    # Group by stock
    by_stock = {}
    for d in dividends:
        symbol = d["symbol"]
        if symbol not in by_stock:
            by_stock[symbol] = {
                "symbol": symbol,
                "name": d["name"],
                "total": 0,
                "count": 0
            }
        by_stock[symbol]["total"] += d["total_dividend"]
        by_stock[symbol]["count"] += 1
    
    return {
        "total_dividend_income": total_income,
        "total_payments": len(dividends),
        "by_year": by_year,
        "by_stock": list(by_stock.values())
    }

# ==================== PERFORMANCE REPORTS ====================

@api_router.get("/performance/report")
async def get_performance_report(
    current_user: User = Depends(require_auth)
):
    """Generate advanced performance report"""
    logger.info("=" * 80)
    logger.info("🔥 NEW PERFORMANCE REPORT CODE IS RUNNING - CACHE CLEARED SUCCESSFULLY!")
    logger.info("=" * 80)
    try:
        # Get transactions
        transactions = await db.transactions.find({
            "user_id": current_user.id
        }).to_list(length=None)
        logger.info(f"Found {len(transactions)} transactions for user {current_user.id} in get_performance_report")
        
        # Get portfolio
        holdings = await db.portfolio.find({
            "user_id": current_user.id
        }).to_list(length=None)
        
        # Calculate current portfolio value
        current_value = 0
        holdings_with_prices = []

        logger.info(f"Performance report: Processing {len(holdings)} holdings")

        for holding in holdings:
            try:
                current_price = 0
                symbol_or_code = holding.get("symbol") or holding.get("scheme_code")

                if holding.get("asset_type") == "MUTUAL_FUND":
                    # For mutual funds, use scheme_code
                    scheme_code = holding.get("scheme_code")
                    logger.info(f"🔥 Fetching MF price for {scheme_code} (cached)")
                    mf_data = get_cached_mutual_fund_nav(scheme_code)
                    if mf_data:
                        current_price = mf_data.get("current_nav", 0)
                        logger.info(f"MF {scheme_code}: NAV={current_price}")
                    else:
                        logger.warning(f"No MF data returned for {scheme_code}")
                else:
                    # For stocks
                    symbol = holding.get("symbol")
                    if symbol:
                        logger.info(f"🔥 Fetching stock price for {symbol} (cached)")
                        stock_data_dict = get_cached_stock_info(symbol)
                        logger.info(f"get_cached_stock_info returned: {stock_data_dict is not None}, keys: {list(stock_data_dict.keys()) if stock_data_dict else 'None'}")

                        if stock_data_dict and symbol in stock_data_dict:
                            current_price = stock_data_dict[symbol].get("current_price", 0)
                            logger.info(f"Stock {symbol}: price={current_price}")
                        else:
                            logger.warning(f"No stock data for {symbol} in response")
                    else:
                        logger.warning(f"Holding has no symbol: {holding}")

                holding_value = holding["quantity"] * current_price
                current_value += holding_value

                logger.info(f"{symbol_or_code}: qty={holding['quantity']}, price={current_price}, value={holding_value}, running_total={current_value}")

                holdings_with_prices.append({
                    **holding,
                    "current_price": current_price,
                    "current_value": holding_value
                })
            except Exception as e:
                logger.error(f"Error fetching price for {holding.get('symbol') or holding.get('scheme_code')}: {e}", exc_info=True)
                # Use existing price if fetch fails
                current_price = holding.get("current_price", holding.get("purchase_price", 0))
                holding_value = holding["quantity"] * current_price
                current_value += holding_value
                holdings_with_prices.append({
                    **holding,
                    "current_price": current_price,
                    "current_value": holding_value
                })

        logger.info(f"Performance report: Total current value calculated = {current_value}")
        
        # Generate performance summary
        performance_data = generate_performance_summary(
            transactions,
            holdings_with_prices,
            current_value
        )
        
        return performance_data
        
    except Exception as e:
        logger.error(f"Error generating performance report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BACKTESTING ROUTES ====================

@api_router.post("/backtest/strategy")
async def run_backtest(
    strategy_id: str,
    start_date: str,
    end_date: str,
    initial_capital: float = 100000,
    current_user: User = Depends(require_auth)
):
    """Run backtest for a strategy"""
    try:
        # Get strategy
        strategy = await db.strategies.find_one({
            "id": strategy_id,
            "user_id": current_user.id
        })
        
        if not strategy:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        # Run backtest
        result = backtest_strategy(
            strategy["criteria"],
            start_date,
            end_date,
            initial_capital
        )
        
        # Calculate score and recommendations
        score = calculate_strategy_score(result)
        recommendations = generate_backtest_recommendations(result)
        
        # Add strategy info
        result["strategy_info"] = {
            "id": strategy["id"],
            "name": strategy["name"],
            "description": strategy["description"]
        }
        result["score"] = score
        result["recommendations"] = recommendations
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running backtest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/backtest/custom")
async def run_custom_backtest(
    criteria: Dict[str, Any],
    start_date: str,
    end_date: str,
    initial_capital: float = 100000,
    current_user: User = Depends(require_auth)
):
    """Run backtest with custom criteria without saving strategy"""
    try:
        # Run backtest
        result = backtest_strategy(
            criteria,
            start_date,
            end_date,
            initial_capital
        )
        
        # Calculate score and recommendations
        score = calculate_strategy_score(result)
        recommendations = generate_backtest_recommendations(result)
        
        result["score"] = score
        result["recommendations"] = recommendations
        
        return result
        
    except Exception as e:
        logger.error(f"Error running custom backtest: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/backtest/presets")
async def get_backtest_presets(current_user: User = Depends(require_auth)):
    """Get preset time periods for backtesting"""
    today = datetime.now()
    
    presets = [
        {
            "label": "Last 1 Year",
            "start_date": (today - timedelta(days=365)).strftime("%Y-%m-%d"),
            "end_date": today.strftime("%Y-%m-%d")
        },
        {
            "label": "Last 2 Years",
            "start_date": (today - timedelta(days=730)).strftime("%Y-%m-%d"),
            "end_date": today.strftime("%Y-%m-%d")
        },
        {
            "label": "Last 3 Years",
            "start_date": (today - timedelta(days=1095)).strftime("%Y-%m-%d"),
            "end_date": today.strftime("%Y-%m-%d")
        },
        {
            "label": "Last 5 Years",
            "start_date": (today - timedelta(days=1825)).strftime("%Y-%m-%d"),
            "end_date": today.strftime("%Y-%m-%d")
        },
        {
            "label": "2020-2024 (Post-COVID)",
            "start_date": "2020-01-01",
            "end_date": "2024-12-31"
        },
        {
            "label": "2015-2020 (Pre-COVID)",
            "start_date": "2015-01-01",
            "end_date": "2019-12-31"
        }
    ]
    
    return presets

# ==================== AI INSIGHTS ROUTES ====================

@api_router.post("/ai/portfolio-optimization")
async def get_ai_portfolio_optimization(
    current_user: User = Depends(require_auth)
):
    """Generate AI-powered portfolio optimization suggestions"""
    try:
        from ai_insights import generate_portfolio_optimization

        logger.info(f"AI optimization requested by user: {current_user.id}")
        
        # Get user profile for risk assessment
        user_profile = await db.users.find_one({"_id": current_user.id})

        # Get portfolio
        holdings = await db.portfolio.find({"user_id": current_user.id}).to_list(length=None)
        
        logger.info(f"Found {len(holdings)} holdings")
        
        if not holdings:
            raise HTTPException(status_code=404, detail="No portfolio found")
        
        # Get current prices and full stock data
        holdings_with_prices = []
        all_stock_data = {}
        
        for holding in holdings:
            try:
                symbol = holding["symbol"]
                stock_data_dict = get_cached_stock_info(symbol)  # This is synchronous and cached
                stock_info = stock_data_dict.get(symbol, {}) if stock_data_dict else {}
                holdings_with_prices.append({
                    **holding,
                    "current_price": stock_info.get("current_price", 0),
                    "current_value": holding["quantity"] * stock_info.get("current_price", 0),
                    "sector": stock_info.get("sector", "Other")
                })
                all_stock_data[symbol] = stock_info
            except Exception as e:
                logger.error(f"Error fetching price for {holding['symbol']}: {e}")
        
        # Calculate analytics
        analytics_data = calculate_portfolio_analytics(holdings_with_prices, all_stock_data)
        
        # Generate AI insights
        portfolio_data = {
            "holdings": holdings_with_prices
        }
        
        logger.info("Calling AI optimization function...")
        insights = await generate_portfolio_optimization(portfolio_data, analytics_data, user_profile)
        
        logger.info("AI optimization successful")
        return insights
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating AI optimization: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/predictive-insights")
async def get_ai_predictive_insights(
    current_user: User = Depends(require_auth)
):
    """Generate AI-powered predictive insights for portfolio"""
    try:
        from ai_insights import generate_predictive_insights

        # Get portfolio
        holdings = await db.portfolio.find({"user_id": current_user.id}).to_list(length=None)
        
        if not holdings:
            raise HTTPException(status_code=404, detail="No portfolio found")
        
        # Get current prices
        holdings_with_prices = []
        for holding in holdings:
            try:
                symbol = holding["symbol"]
                stock_data_dict = get_cached_stock_info(symbol)  # This is synchronous and cached
                stock_info = stock_data_dict.get(symbol, {}) if stock_data_dict else {}
                holdings_with_prices.append({
                    **holding,
                    "current_price": stock_info.get("current_price", 0),
                    "sector": stock_info.get("sector", "Other")
                })
            except Exception as e:
                logger.error(f"Error fetching data for {holding['symbol']}: {e}")
        
        # Generate AI insights
        portfolio_data = {
            "holdings": holdings_with_prices
        }
        
        insights = await generate_predictive_insights(portfolio_data)
        
        return insights
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating predictive insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ai/stock-analysis/{symbol}")
async def get_ai_stock_analysis(
    symbol: str,
    current_user: User = Depends(require_auth)
):
    """Generate AI-powered analysis for a specific stock"""
    try:
        from ai_insights import generate_stock_analysis

        # Get stock data
        stock_data_dict = get_cached_stock_info(symbol)
        stock_data = stock_data_dict.get(symbol, {}) if stock_data_dict else {}
        
        # Generate AI analysis
        analysis = await generate_stock_analysis(symbol, stock_data)
        
        return {
            "symbol": symbol,
            "analysis": analysis
        }
        
    except Exception as e:
        logger.error(f"Error generating stock analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/stocks/debug")
async def debug_stocks():
    """Get debug info about loaded stocks"""
    try:
        from market_data import get_equity_debug_info
        return get_equity_debug_info()
    except Exception as e:
        return {"error": str(e)}

# ==================== PORTFOLIO & WATCHLIST ENDPOINTS ====================

class HoldingCreate(BaseModel):
    symbol: str
    quantity: int
    buy_price: float
    purchase_date: Optional[str] = None

@api_router.post("/portfolio/holdings")
async def add_holding(holding: HoldingCreate, current_user: User = Depends(require_auth)):
    try:
        holding_dict = holding.dict()
        holding_dict["user_id"] = current_user.email  # Simple user association
        holding_dict["created_at"] = datetime.now(timezone.utc).isoformat()

        if db is not None:
             await db.holdings.insert_one(holding_dict)

        # Remove MongoDB ObjectId before returning (not JSON serializable)
        holding_dict.pop("_id", None)

        return {"message": "Holding added successfully", "data": holding_dict}
    except Exception as e:
        logger.error(f"Error adding holding: {e}")
        raise HTTPException(status_code=500, detail="Failed to add holding")

@api_router.get("/portfolio/holdings")
async def get_holdings(current_user: User = Depends(require_auth)):
    try:
        if db is None:
            return []
        
        cursor = db.holdings.find({"user_id": current_user.email})
        holdings = await cursor.to_list(length=100)
        
        # Convert ObjectId to string for JSON serialization
        results = []
        for h in holdings:
            h["id"] = str(h["_id"])
            del h["_id"]
            results.append(h)
            
        return results
    except Exception as e:
        logger.error(f"Error fetching holdings: {e}")
        return []

app.include_router(api_router)
app.include_router(create_auth_recovery_router(lambda: db, logger))

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for real-time updates to clients.

    Architecture: Push-only design (server -> client)
    - Server pushes real-time stock price updates to connected clients
    - Client messages are not processed (receive_text() is called only to keep connection alive)
    - The websocket manager handles broadcasting updates to all connected clients

    Args:
        websocket: WebSocket connection
        user_id: Unique identifier for the user

    Note: If bidirectional communication is needed in the future, implement
    message handling in the while loop to process client requests.
    """
    await manager.connect(user_id, websocket)
    try:
        while True:
            # Keep the connection alive by receiving (but not processing) client messages
            # This is a push-only WebSocket - server sends updates, client doesn't send commands
            data = await websocket.receive_text()
            # Intentionally not processing incoming messages - this is server-push only
            pass
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        manager.disconnect(user_id)

async def simulate_ticker_updates():
    """Background task to simulate real-time market data updates"""
    BASE_PRICES = {
        'NIFTY 50': 24350.50, 'SENSEX': 81687.00, 'BANK NIFTY': 52400.00,
        'RELIANCE': 3200.00, 'TCS': 4150.00, 'INFY': 1850.00,
        'HDFCBANK': 1600.00, 'ICICIBANK': 1150.00, 'SBIN': 850.00,
        'TATAMOTORS': 980.00, 'BAJFINANCE': 6900.00, 'WIPRO': 480.00
    }
    
    while True:
        try:
            updates = []
            for symbol, base_price in BASE_PRICES.items():
                # Simulate randomness
                fluctuation = random.uniform(-0.005, 0.005) # +/- 0.5%
                current_price = base_price * (1 + fluctuation)
                change_pct = f"{'+' if fluctuation >= 0 else ''}{fluctuation*100:.2f}%"
                
                updates.append({
                    "symbol": symbol,
                    "price": f"{current_price:,.2f}",
                    "change": change_pct
                })
            
            # Broadcast to all connected clients
            await manager.broadcast(updates)
            
            # Update every 2 seconds
            await asyncio.sleep(2)
        except Exception as e:
            logger.error(f"Ticker simulation error: {e}")
            await asyncio.sleep(5)

# --- Temporary Google OAuth Fix ---

@app.get("/api/auth/google")
async def google_auth_placeholder(request: Request):
    """
    Temporary placeholder for Google OAuth callback.
    This prevents frontend login errors during local testing.
    """
    return JSONResponse(
        content={"message": "Google OAuth placeholder endpoint reached. Actual auth not yet implemented."},
        status_code=200
    )
@app.post("/api/auth/local-login")
async def local_login(request: Request):
    """
    Temporary local login endpoint for offline testing.
    """
    data = await request.json()
    username = data.get("username", "Guest")
    return JSONResponse(
        content={"message": f"Welcome, {username}! (local mode)", "token": "fake-token"},
        status_code=200
    )
