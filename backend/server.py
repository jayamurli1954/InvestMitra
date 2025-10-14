from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, Cookie, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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
    get_all_stocks_basic, get_current_price
)
from analytics import (
    calculate_portfolio_analytics, calculate_rebalancing_suggestions,
    generate_stock_recommendations
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

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
    symbol: str
    name: str
    quantity: int
    purchase_price: float
    purchase_date: str
    current_price: float = 0.0

class PortfolioHoldingCreate(BaseModel):
    symbol: str
    name: str
    quantity: int
    purchase_price: float
    purchase_date: str

class WatchlistItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    symbol: str
    name: str
    added_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WatchlistItemCreate(BaseModel):
    symbol: str
    name: str

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

# ==================== REAL-TIME DATA ====================
# All stock data now fetched from Yahoo Finance via market_data.py

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Investment Framework API"}

# ==================== AUTH ENDPOINTS ====================

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

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin, response: Response):
    """Login with email/password"""
    # Find user
    user_doc = await db.users.find_one({"email": user_data.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_doc["id"] = user_doc.pop("_id")
    user = User(**user_doc)
    
    # Verify password
    if not user.password_hash or not verify_password(user_data.password, user.password_hash):
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
async def google_auth_callback(session_id: str, response: Response):
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

@api_router.get("/stocks/search")
async def search_stocks(q: str = Query(..., min_length=1)):
    """Search stocks by symbol or name"""
    query = q.lower()
    all_stocks = get_all_stocks_basic()
    results = [
        StockBasic(**stock)
        for stock in all_stocks
        if query in stock["symbol"].lower() or query in stock["name"].lower()
    ]
    return results[:10]

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

@api_router.get("/market/overview")
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
async def get_portfolio(current_user: User = Depends(require_auth)):
    holdings = await db.portfolio.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    # Update current prices with real-time data
    for holding in holdings:
        current_price = get_current_price(holding["symbol"])
        if current_price > 0:
            holding["current_price"] = current_price
    
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

@api_router.delete("/portfolio/{holding_id}")
async def delete_portfolio_holding(holding_id: str, current_user: User = Depends(require_auth)):
    result = await db.portfolio.delete_one({"id": holding_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Holding not found")
    return {"message": "Holding deleted successfully"}

@api_router.get("/portfolio/performance")
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
async def get_watchlist(current_user: User = Depends(require_auth)):
    items = await db.watchlist.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/watchlist", response_model=WatchlistItem)
async def add_watchlist_item(item: WatchlistItemCreate, current_user: User = Depends(require_auth)):
    item_obj = WatchlistItem(**item.model_dump(), user_id=current_user.id)
    doc = item_obj.model_dump()
    await db.watchlist.insert_one(doc)
    return item_obj

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

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()