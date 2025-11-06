from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, Cookie, Response, Request, WebSocket
from websocket_manager import manager
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import random
import requests
from auth_utils import (
    User, UserPublic, UserSession, UserRegister, UserLogin, Token,
    verify_password, get_password_hash, create_access_token, decode_access_token
)
from market_data import (
    get_stock_info, get_historical_data, get_market_indices, 
    get_all_stocks_basic, get_current_price, get_mutual_fund_nav
)
from mutual_fund_data import search_mutual_funds, get_current_nav
from analytics import (
    calculate_portfolio_analytics, calculate_rebalancing_suggestions,
    generate_stock_recommendations
)
from watchlist_analytics import (
    update_watchlist_analytics,
    get_watchlist_analytics,
    bulk_update_analytics
)
import asyncio
from performance import generate_performance_summary
from backtesting import backtest_strategy, calculate_strategy_score, generate_backtest_recommendations
from ai_insights import generate_portfolio_optimization, generate_predictive_insights, generate_stock_analysis

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - will be initialized on app startup
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = None
db = None

async def init_db():
    """Initialize MongoDB connection on startup"""
    global client, db
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client[os.environ['DB_NAME']]
        # Test connection
        await db.command('ping')
        logging.info("✓ MongoDB connected successfully")
    except Exception as e:
        logging.error(f"✗ MongoDB connection failed: {e}")
        db = None
        client = None

async def close_db():
    """Close MongoDB connection on shutdown"""
    global client
    if client:
        client.close()
        logging.info("MongoDB connection closed")

# CORS configuration
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Register startup and shutdown events
@app.on_event("startup")
async def startup_event():
    await init_db()

@app.on_event("shutdown")
async def shutdown_event():
    await close_db()

api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

import time
from functools import wraps

class Cache:
    def __init__(self, ttl: int = 60):
        self.cache = {}
        self.ttl = ttl

    def get(self, key: str):
        if key in self.cache:
            data, timestamp = self.cache[key]
            if (time.time() - timestamp) < self.ttl:
                return data
        return None

    def set(self, key: str, value: any):
        self.cache[key] = (value, time.time())

cache_instance = Cache(ttl=60) # Cache for 60 seconds

def cached(key_prefix: str):
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
            cache_instance.set(cache_key, result)
            return result
        return wrapper
    return decorator

# ==================== AUTH DEPENDENCY ====================

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session_token: Optional[str] = Cookie(None)
) -> Optional[User]:
    """Get current user from session token (cookie or header)"""
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
    asset_type: str = "STOCK"

# === PATCH START: REPLACE LINES 207-218 WITH THIS CODE ===
class WatchlistItem(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    id: str = Field(alias="_id")
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
    asset_type: str
    
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

# ==================== REAL-TIME DATA ====================
# All stock data now fetched from Yahoo Finance via market_data.py

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
async def register(user_data: UserRegister, response: Response):
    """Register new user with email/password"""
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=get_password_hash(user_data.password),
        auth_provider="email"
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

@api_router.options("/auth/register")
async def register_options():
    """Handle CORS preflight for register"""
    return Response(status_code=200)



@api_router.options("/auth/login")
async def login_options():
    return Response(status_code=200)    
@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin, response: Response):
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
            headers={"X-Session-ID": session_id}
        )
        auth_response.raise_for_status()
        session_data = auth_response.json()
        logger.info(f"Google OAuth successful for user: {session_data.get('email')}")
    except Exception as e:
        logger.error(f"Google OAuth failed: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid session ID")
    
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

@api_router.get("/stocks/search")
async def search_stocks(q: str = Query(..., min_length=1)):
    """
    Dynamic stock search:
    - Checks DB first
    - Falls back to local basic list
    - If not found, fetches from Yahoo Finance and auto-inserts into MongoDB
    """
    q_raw = q.strip()
    q_upper = q_raw.upper()

    # 1️⃣ Try database first
    try:
        doc = await db.stocks.find_one({"symbol": {"$in": [q_upper, q_upper + ".NS", q_upper + ".BO"]}})
        if doc:
            stock_basic = {
                "symbol": doc.get("symbol"),
                "name": doc.get("name", ""),
                "exchange": doc.get("exchange", "NSE"),
                "sector": doc.get("sector", "")
            }
            return [StockBasic(**stock_basic)]
    except Exception as e:
        logger.warning(f"DB lookup error: {e}")

    # 2️⃣ Try local static list for fuzzy matches
    try:
        all_stocks = get_all_stocks_basic() or []
        q_lower = q_raw.lower()
        fuzzy = [
            StockBasic(**stock)
            for stock in all_stocks
            if q_lower in stock.get("symbol", "").lower() or q_lower in stock.get("name", "").lower()
        ]
        if fuzzy:
            return fuzzy[:10]
    except Exception as e:
        logger.warning(f"get_all_stocks_basic() error: {e}")

    # 3️⃣ Live lookup from Yahoo Finance if not found
    possible_symbols = [q_upper]
    if not q_upper.endswith(".NS"):
        possible_symbols.append(q_upper + ".NS")
    if not q_upper.endswith(".BO"):
        possible_symbols.append(q_upper + ".BO")

    for sym in possible_symbols:
        try:
            info = await asyncio.to_thread(lambda s=sym: getattr(yf.Ticker(s), "info", {}) or {})
            if info and ("longName" in info or "shortName" in info):
                name = info.get("longName") or info.get("shortName") or q_raw
                last_price = info.get("currentPrice") or info.get("regularMarketPrice")
                exchange = info.get("exchange") or info.get("market") or ("NSE" if sym.endswith(".NS") else "BSE")
                sector = info.get("sector") or ""

                stock_doc = {
                    "symbol": info.get("symbol", sym),
                    "name": name,
                    "exchange": exchange,
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

    # 4️⃣ If nothing found
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
    all_stocks = get_all_stocks_basic()
    return [StockBasic(**stock) for stock in all_stocks]

@api_router.get("/stocks/{symbol}", response_model=StockDetail)
async def get_stock_detail(symbol: str):
    """Get detailed stock information with real-time data"""
    stock_data = get_stock_info(symbol)
    if not stock_data:
        raise HTTPException(status_code=404, detail="Stock not found")
    return StockDetail(**stock_data)

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
        mf_data = get_mutual_fund_nav(scheme_code)
        
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
    all_stocks = get_all_stocks_basic()
    
    # Apply sector filter
    if sector and sector != "All":
        all_stocks = [s for s in all_stocks if s["sector"].lower() == sector.lower()]
    
    results = []
    for stock_basic in all_stocks:
        # Get detailed real-time info
        stock_data = get_stock_info(stock_basic["symbol"])
        if not stock_data:
            continue
        
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
@api_router.get("/portfolio", response_model=List[PortfolioHolding])
@cached(key_prefix="portfolio")
async def get_portfolio(current_user: User = Depends(require_auth)):
    holdings = await db.portfolio.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    # Update current prices with real-time data
    for holding in holdings:
        # Check if it's a mutual fund or stock
        if holding.get("asset_type") == "MUTUAL_FUND":
            # For mutual funds, use scheme_code to get NAV
            scheme_code = holding.get("scheme_code")
            if scheme_code:
                nav_data = get_mutual_fund_nav(scheme_code)
                if nav_data and nav_data.get('current_nav'):
                    holding["current_nav"] = nav_data['current_nav']
                    holding["current_price"] = nav_data['current_nav']
        else:
            # For stocks, use symbol to get price
            symbol = holding.get("symbol")
            if symbol:
                current_price = get_current_price(symbol)
                if current_price > 0:
                    holding["current_price"] = current_price
    
    # Sort alphabetically by symbol or scheme_code
    holdings = sorted(holdings, key=lambda x: x.get("symbol") or x.get("scheme_code") or "")
    
    return holdings

@api_router.post("/portfolio", response_model=PortfolioHolding)
async def add_portfolio_holding(holding: PortfolioHoldingCreate, current_user: User = Depends(require_auth)):
    holding_obj = PortfolioHolding(**holding.model_dump(), user_id=current_user.id)
    
    # Get real-time current price
    current_price = get_current_price(holding.symbol)
    if current_price > 0:
        holding_obj.current_price = current_price
    
    doc = holding_obj.model_dump()
    await db.portfolio.insert_one(doc)
    return holding_obj

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
    holdings = await db.portfolio.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    total_invested = 0.0
    total_current = 0.0
    
    for holding in holdings:
        # Calculate invested amount (always included)
        invested = float(holding["quantity"]) * float(holding["purchase_price"])
        total_invested += invested
        
        # Get real-time current price
        current_price = get_current_price(holding["symbol"])
        if current_price > 0:
            current = float(holding["quantity"]) * float(current_price)
            total_current += current
        else:
            # If can't fetch current price, use stored current_price or purchase_price as fallback
            fallback_price = holding.get("current_price", holding["purchase_price"])
            current = float(holding["quantity"]) * float(fallback_price)
            total_current += current
            logger.warning(f"Could not fetch current price for {holding['symbol']}, using fallback: {fallback_price}")
    
    total_gain = total_current - total_invested
    total_gain_percent = (total_gain / total_invested * 100) if total_invested > 0 else 0
    
    return {
        "total_invested": round(total_invested, 2),
        "total_current": round(total_current, 2),
        "total_gain": round(total_gain, 2),
        "total_gain_percent": round(total_gain_percent, 2)
    }

# Watchlist endpoints
@api_router.get("/watchlist", response_model=List[WatchlistItem])
@cached(key_prefix="watchlist")
async def get_watchlist(current_user: User = Depends(require_auth)):
    items = await db.watchlist.find({"user_id": current_user.id}).to_list(1000)
    
    # Convert ObjectId to string and enrich with current prices
    for item in items:
        if "_id" in item:
            item["_id"] = str(item["_id"])
        
        # Auto-detect if mutual fund (all numbers) or stock
        symbol = item.get("symbol", "")
        logger.info(f"🔍 Processing symbol: {symbol}")
        is_mutual_fund = symbol.isdigit()
        logger.info(f"📊 is_mutual_fund={is_mutual_fund} for {symbol}")
        
        if is_mutual_fund:
            logger.info(f"💰 Fetching MF NAV for {symbol}")
            # Get mutual fund NAV
            nav_data = get_mutual_fund_nav(symbol)
            if nav_data and nav_data.get('current_nav'):
                item["current_nav"] = nav_data['current_nav']
                item["current_price"] = nav_data['current_nav']
                item["change_percent"] = 0
                item["high"] = 0
                item["low"] = 0
                item["name"] = nav_data.get("scheme_name", item.get("name", "Unknown Fund"))
                logger.info(f"✅ MF price set: {nav_data['current_nav']}")
        else:
            logger.info(f"📈 Fetching STOCK price for {symbol}")
            # Get stock info
            stock_data = get_stock_info(symbol)
            if stock_data:
                item["current_price"] = stock_data.get("current_price", 0)
                item["change_percent"] = stock_data.get("change_percent", 0)
                item["high"] = stock_data.get("week_52_high", 0)
                item["low"] = stock_data.get("week_52_low", 0)
                logger.info(f"✅ Stock price set: {item['current_price']}")
            else:
                logger.warning(f"❌ Stock price is 0 for {symbol}")

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
    
    # Update current prices and get stock data
    stock_data = {}
    for holding in holdings:
        current_price = get_current_price(holding["symbol"])
        if current_price > 0:
            holding["current_price"] = current_price
        
        # Get full stock info
        stock_info = get_stock_info(holding["symbol"])
        if stock_info:
            stock_data[holding["symbol"]] = stock_info
    
    analytics = calculate_portfolio_analytics(holdings, stock_data)
    return analytics

@api_router.post("/analytics/rebalance")
async def get_rebalancing_suggestions(
    target_allocation: Dict[str, float],
    current_user: User = Depends(require_auth)
):
    """Get portfolio rebalancing suggestions"""
    holdings = await db.portfolio.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    # Update current prices and get stock data
    stock_data = {}
    for holding in holdings:
        current_price = get_current_price(holding["symbol"])
        if current_price > 0:
            holding["current_price"] = current_price
        
        stock_info = get_stock_info(holding["symbol"])
        if stock_info:
            stock_data[holding["symbol"]] = stock_info
    
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
    all_stocks_basic = get_all_stocks_basic()
    all_stocks_detailed = []
    
    for stock_basic in all_stocks_basic[:30]:  # Limit to avoid timeout
        stock_detail = get_stock_info(stock_basic["symbol"])
        if stock_detail:
            all_stocks_detailed.append(stock_detail)
    
    recommendations = generate_stock_recommendations(
        criteria, all_stocks_detailed, existing_symbols, limit=10
    )
    
    return {"recommendations": recommendations, "criteria": criteria}



# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite default
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
            current_data = await get_stock_info(holding["symbol"])
            current_price = current_data.get("current_price", 0)
            
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
            stock_data = await get_stock_info(alert["symbol"])
            current_price = stock_data.get("current_price", 0)
            
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
    try:
        # Get transactions
        transactions = await db.transactions.find({
            "user_id": current_user.id
        }).to_list(length=None)
        
        # Get portfolio
        holdings = await db.portfolio.find({
            "user_id": current_user.id
        }).to_list(length=None)
        
        # Calculate current portfolio value
        current_value = 0
        holdings_with_prices = []
        
        for holding in holdings:
            try:
                stock_data = get_stock_info(holding["symbol"])
                current_price = stock_data.get("current_price", 0) if stock_data else 0
                holding_value = holding["quantity"] * current_price
                current_value += holding_value
                
                holdings_with_prices.append({
                    **holding,
                    "current_price": current_price,
                    "current_value": holding_value
                })
            except Exception as e:
                logger.error(f"Error fetching price for {holding['symbol']}: {e}")
                # Use existing price if fetch fails
                current_price = holding.get("current_price", holding.get("purchase_price", 0))
                holding_value = holding["quantity"] * current_price
                current_value += holding_value
                holdings_with_prices.append({
                    **holding,
                    "current_price": current_price,
                    "current_value": holding_value
                })
        
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
        logger.info(f"AI optimization requested by user: {current_user.id}")
        
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
                stock_info = get_stock_info(holding["symbol"])  # This is synchronous
                holdings_with_prices.append({
                    **holding,
                    "current_price": stock_info.get("current_price", 0),
                    "current_value": holding["quantity"] * stock_info.get("current_price", 0),
                    "sector": stock_info.get("sector", "Other")
                })
                all_stock_data[holding["symbol"]] = stock_info
            except Exception as e:
                logger.error(f"Error fetching price for {holding['symbol']}: {e}")
        
        # Calculate analytics
        analytics_data = calculate_portfolio_analytics(holdings_with_prices, all_stock_data)
        
        # Generate AI insights
        portfolio_data = {
            "holdings": holdings_with_prices
        }
        
        logger.info("Calling AI optimization function...")
        insights = await generate_portfolio_optimization(portfolio_data, analytics_data)
        
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
        # Get portfolio
        holdings = await db.portfolio.find({"user_id": current_user.id}).to_list(length=None)
        
        if not holdings:
            raise HTTPException(status_code=404, detail="No portfolio found")
        
        # Get current prices
        holdings_with_prices = []
        for holding in holdings:
            try:
                stock_info = get_stock_info(holding["symbol"])  # This is synchronous
                holdings_with_prices.append({
                    **holding,
                    "current_price": stock_info.get("current_price", 0),
                    "sector": stock_info.get("sector", "Other")
                })
            except Exception as e:
                logger.error(f"Error fetching data for {holding['symbol']}: {e}")
        
        # Get market trends (simplified)
        market_trends = {
            "nifty_trend": "Bullish",  # In production, fetch real data
            "sentiment": "Positive"
        }
        
        # Generate AI insights
        portfolio_data = {
            "holdings": holdings_with_prices
        }
        
        insights = await generate_predictive_insights(portfolio_data, market_trends)
        
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
        # Get stock data
        stock_data = await get_stock_info(symbol)
        
        # Generate AI analysis
        analysis = await generate_stock_analysis(symbol, stock_data)
        
        return {
            "symbol": symbol,
            "analysis": analysis
        }
        
    except Exception as e:
        logger.error(f"Error generating stock analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(api_router)

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # For now, we don't need to handle incoming messages
            # We are just using the websocket to push data to the client
            pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        manager.disconnect(user_id)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
# --- Temporary Google OAuth Fix ---
from fastapi.responses import JSONResponse
from fastapi import Request

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


# ============================================================================
# PASSWORD RESET HELPER FUNCTIONS
# ============================================================================

import bcrypt
from bson import ObjectId

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_password_reset_record(db, user_id, email: str) -> str:
    """Create a password reset token record in database"""
    import uuid
    from datetime import datetime, timezone, timedelta
    
    reset_token = str(uuid.uuid4())
    
    # Store reset token in database (expires in 24 hours)
    db["password_resets"].insert_one({
        "user_id": user_id,
        "email": email,
        "token": reset_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        "used": False
    })
    
    return reset_token

def validate_reset_token(db, token: str):
    """Validate reset token - check if it exists and is not expired"""
    from datetime import datetime, timezone
    
    reset_record = db["password_resets"].find_one({"token": token})
    
    if not reset_record:
        return None
    
    # Check if expired
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        return None
    
    # Check if already used
    if reset_record.get("used"):
        return None
    
    return reset_record

def mark_reset_token_as_used(db, token: str):
    """Mark reset token as used"""
    db["password_resets"].update_one(
        {"token": token},
        {"$set": {"used": True}}
    )

def mask_email(email: str) -> str:
    """Mask email for security - jayamurli1954@gmail.com -> jaya***@gmail.com"""
    parts = email.split("@")
    if len(parts) != 2:
        return email
    
    local = parts[0]
    domain = parts[1]
    
    # Show first 4 chars + *** + rest
    if len(local) > 4:
        masked_local = local[:4] + "***"
    else:
        masked_local = "***"
    
    return f"{masked_local}@{domain}"

def find_user_by_name(db, full_name: str):
    """Find user by full name (case-insensitive)"""
    user = db.users.find_one({
        "name": {"$regex": f"^{full_name}$", "$options": "i"}
    })
    return user

# ============================================================================
# PASSWORD RESET ENDPOINTS
# ============================================================================

@app.post("/api/auth/forgot-password")
async def forgot_password(request_data: dict):
    """
    Request password reset - sends email with reset link
    Body: {"email": "user@example.com"}
    """
    from email_utils import send_password_reset_email
    
    try:
        email = request_data.get("email")
        
        if not email:
            return JSONResponse(
                content={"error": "Email is required"},
                status_code=400
            )
        
        # Find user by email
        user = await db.users.find_one({"email": {"$regex": f"^{email.strip().lower()}$", "$options": "i"}})
        
        if not user:
            # Don't reveal if email exists (security)
            return JSONResponse(
                content={"message": "If email exists, reset link has been sent"},
                status_code=200
            )
        
        # Create reset token
        reset_token = create_password_reset_record(db, user["_id"], email)
        
        # Send email
        email_sent = send_password_reset_email(
            user_email=email,
            reset_token=reset_token,
            user_name=user.get("full_name", "User")
        )
        
        if email_sent:
            return JSONResponse(
                content={"message": "Password reset email has been sent"},
                status_code=200
            )
        else:
            return JSONResponse(
                content={"error": "Failed to send email"},
                status_code=500
            )
    
    except Exception as e:
        print(f"Error in forgot_password: {str(e)}")
        return JSONResponse(
            content={"error": "An error occurred"},
            status_code=500
        )


@app.post("/api/auth/reset-password")
async def reset_password(request_data: dict):
    """
    Reset password with token
    """
    print(f"DEBUG: Received request_data: {request_data}")
    
    try:
        token = request_data.get("token", "").strip()
        new_password = request_data.get("new_password")
        confirm_password = request_data.get("confirm_password")
        
        # If token contains full URL, extract just the token part
        if token and "token=" in token:
            token = token.split("token=")[-1].strip()
            print(f"DEBUG: Extracted token from URL: {token}")
        
        print(f"DEBUG: token={token}, new_password={new_password}, confirm_password={confirm_password}")
        
        # Validate input
        if not token or not new_password or not confirm_password:
            error_msg = f"Missing fields: token={bool(token)}, new_password={bool(new_password)}, confirm_password={bool(confirm_password)}"
            print(f"DEBUG: {error_msg}")
            return JSONResponse(
                content={"error": error_msg},
                status_code=400
            )
        
        # Check passwords match
        if new_password != confirm_password:
            print(f"DEBUG: Passwords don't match")
            return JSONResponse(
                content={"error": "Passwords do not match"},
                status_code=400
            )
        
        # Validate password length
        if len(new_password) < 8:
            print(f"DEBUG: Password too short: {len(new_password)}")
            return JSONResponse(
                content={"error": "Password must be at least 8 characters long"},
                status_code=400
            )
        
        print(f"DEBUG: Validation passed, looking for token in DB")
        
        # Validate token from database (ASYNC)
        from datetime import datetime, timezone
        reset_record = await db["password_resets"].find_one({"token": token})
        
        print(f"DEBUG: reset_record found: {reset_record is not None}")
        
        if not reset_record:
            print(f"DEBUG: Token not found in database")
            return JSONResponse(
                content={"error": "Invalid or expired reset token"},
                status_code=400
            )
        
        # Check if expired
        expires_at = datetime.fromisoformat(reset_record["expires_at"])
        if datetime.now(timezone.utc) > expires_at:
            print(f"DEBUG: Token expired")
            return JSONResponse(
                content={"error": "Reset token has expired"},
                status_code=400
            )
        
        # Check if already used
        if reset_record.get("used"):
            print(f"DEBUG: Token already used")
            return JSONResponse(
                content={"error": "This reset token has already been used"},
                status_code=400
            )
        
        print(f"DEBUG: All checks passed, updating password")
        
        # Update user password
        user_id = reset_record["user_id"]
        hashed_password = get_password_hash(new_password)
        
        await db.users.update_one(
            {"_id": user_id},
            {"$set": {"password_hash": hashed_password}}
        )
        
        print(f"DEBUG: Password updated")
        
        # Mark token as used
        await db["password_resets"].update_one(
            {"token": token},
            {"$set": {"used": True}}
        )
        
        print(f"DEBUG: Token marked as used - SUCCESS!")
        
        return JSONResponse(
            content={"message": "Password has been reset successfully", "success": True},
            status_code=200
        )
    
    except Exception as e:
        print(f"ERROR in reset_password: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            content={"error": "An error occurred: " + str(e)},
            status_code=500
        )


@app.post("/api/auth/recover-email")
async def recover_email(request_data: dict):
    """
    Recover email address by full name
    Body: {"full_name": "John Doe"}
    """
    try:
        full_name = request_data.get("full_name")
        
        if not full_name:
            return JSONResponse(
                content={"error": "Full name is required"},
                status_code=400
            )
        
        # Find user by name
        user = find_user_by_name(db, full_name)
        
        if not user:
            return JSONResponse(
                content={"error": "No account found with that name"},
                status_code=404
            )
        
        # Mask the email
        masked_email = mask_email(user["email"])
        
        return JSONResponse(
            content={
                "message": f"Account found",
                "masked_email": masked_email
            },
            status_code=200
        )
    
    except Exception as e:
        print(f"Error in recover_email: {str(e)}")
        return JSONResponse(
            content={"error": "An error occurred"},
            status_code=500
        )


@app.post("/api/auth/verify-email")
async def verify_email(request_data: dict):
    """
    Verify email with token (for future use)
    Body: {"token": "verification_token"}
    """
    try:
        token = request_data.get("token")
        
        if not token:
            return JSONResponse(
                content={"error": "Token is required"},
                status_code=400
            )
        
        # For now, just return success
        # In future, validate token and mark email as verified
        
        return JSONResponse(
            content={"message": "Email verified successfully"},
            status_code=200
        )
    
    except Exception as e:
        print(f"Error in verify_email: {str(e)}")
        return JSONResponse(
            content={"error": "An error occurred"},
            status_code=500
        )