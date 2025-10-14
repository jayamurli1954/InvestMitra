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
    \"\"\"Require authentication\"\"\"
    if not current_user:
        raise HTTPException(status_code=401, detail=\"Not authenticated\")
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
    symbol: str
    name: str
    added_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class WatchlistItemCreate(BaseModel):
    symbol: str
    name: str

class Strategy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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

# ==================== MOCK DATA ====================

MOCK_STOCKS = [
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "exchange": "NSE", "sector": "Energy", "price": 2456.75, "pe": 28.5, "roe": 11.2, "pb": 2.1, "dy": 0.35, "de": 0.48},
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "exchange": "NSE", "sector": "IT", "price": 3890.50, "pe": 32.1, "roe": 45.8, "pb": 14.2, "dy": 1.45, "de": 0.05},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank", "exchange": "NSE", "sector": "Banking", "price": 1645.30, "pe": 19.8, "roe": 17.5, "pb": 2.9, "dy": 1.2, "de": 0.0},
    {"symbol": "INFY.NS", "name": "Infosys", "exchange": "NSE", "sector": "IT", "price": 1567.80, "pe": 27.4, "roe": 31.2, "pb": 8.5, "dy": 2.1, "de": 0.0},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank", "exchange": "NSE", "sector": "Banking", "price": 1098.65, "pe": 18.2, "roe": 15.8, "pb": 2.7, "dy": 0.95, "de": 0.0},
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel", "exchange": "NSE", "sector": "Telecom", "price": 1534.20, "pe": 45.6, "roe": 12.5, "pb": 7.8, "dy": 0.65, "de": 2.1},
    {"symbol": "ITC.NS", "name": "ITC Limited", "exchange": "NSE", "sector": "FMCG", "price": 456.90, "pe": 26.8, "roe": 22.4, "pb": 6.2, "dy": 3.45, "de": 0.0},
    {"symbol": "SBIN.NS", "name": "State Bank of India", "exchange": "NSE", "sector": "Banking", "price": 798.45, "pe": 12.5, "roe": 13.2, "pb": 1.4, "dy": 1.8, "de": 0.0},
    {"symbol": "LT.NS", "name": "Larsen & Toubro", "exchange": "NSE", "sector": "Infrastructure", "price": 3567.30, "pe": 34.2, "roe": 14.8, "pb": 5.1, "dy": 0.85, "de": 0.92},
    {"symbol": "HCLTECH.NS", "name": "HCL Technologies", "exchange": "NSE", "sector": "IT", "price": 1823.55, "pe": 28.9, "roe": 19.7, "pb": 5.8, "dy": 2.8, "de": 0.04},
    {"symbol": "AXISBANK.NS", "name": "Axis Bank", "exchange": "NSE", "sector": "Banking", "price": 1087.20, "pe": 15.7, "roe": 14.3, "pb": 1.9, "dy": 0.75, "de": 0.0},
    {"symbol": "WIPRO.NS", "name": "Wipro Limited", "exchange": "NSE", "sector": "IT", "price": 567.40, "pe": 24.3, "roe": 16.8, "pb": 3.2, "dy": 1.95, "de": 0.07},
    {"symbol": "ASIANPAINT.NS", "name": "Asian Paints", "exchange": "NSE", "sector": "Consumer Goods", "price": 2934.60, "pe": 58.7, "roe": 28.5, "pb": 16.4, "dy": 0.95, "de": 0.0},
    {"symbol": "MARUTI.NS", "name": "Maruti Suzuki", "exchange": "NSE", "sector": "Automobile", "price": 12456.75, "pe": 28.1, "roe": 13.9, "pb": 4.2, "dy": 1.35, "de": 0.08},
    {"symbol": "SUNPHARMA.NS", "name": "Sun Pharmaceutical", "exchange": "NSE", "sector": "Pharma", "price": 1678.30, "pe": 42.3, "roe": 8.7, "pb": 5.9, "dy": 0.55, "de": 0.01},
    {"symbol": "TITAN.NS", "name": "Titan Company", "exchange": "NSE", "sector": "Consumer Goods", "price": 3456.80, "pe": 78.4, "roe": 25.6, "pb": 22.1, "dy": 0.45, "de": 0.12},
    {"symbol": "NTPC.NS", "name": "NTPC Limited", "exchange": "NSE", "sector": "Power", "price": 345.60, "pe": 14.8, "roe": 10.2, "pb": 1.8, "dy": 3.2, "de": 1.85},
    {"symbol": "POWERGRID.NS", "name": "Power Grid Corporation", "exchange": "NSE", "sector": "Power", "price": 298.75, "pe": 16.5, "roe": 12.1, "pb": 2.1, "dy": 3.8, "de": 2.12},
    {"symbol": "ULTRACEMCO.NS", "name": "UltraTech Cement", "exchange": "NSE", "sector": "Cement", "price": 9876.40, "pe": 32.6, "roe": 15.4, "pb": 5.3, "dy": 0.65, "de": 0.28},
    {"symbol": "TECHM.NS", "name": "Tech Mahindra", "exchange": "NSE", "sector": "IT", "price": 1645.25, "pe": 35.8, "roe": 11.9, "pb": 4.1, "dy": 2.4, "de": 0.03},
]

def generate_stock_detail(stock_data: dict) -> StockDetail:
    """Generate detailed stock info with mock data"""
    price = stock_data["price"]
    change = random.uniform(-50, 50)
    change_percent = (change / price) * 100
    
    return StockDetail(
        symbol=stock_data["symbol"],
        name=stock_data["name"],
        exchange=stock_data["exchange"],
        sector=stock_data["sector"],
        current_price=round(price, 2),
        change=round(change, 2),
        change_percent=round(change_percent, 2),
        volume=random.randint(1000000, 50000000),
        market_cap=round(price * random.uniform(100000, 5000000), 2),
        pe_ratio=stock_data.get("pe"),
        pb_ratio=stock_data.get("pb"),
        roe=stock_data.get("roe"),
        debt_to_equity=stock_data.get("de"),
        dividend_yield=stock_data.get("dy"),
        week_52_high=round(price * random.uniform(1.05, 1.25), 2),
        week_52_low=round(price * random.uniform(0.75, 0.95), 2),
        rsi=round(random.uniform(30, 70), 2),
        ma_50=round(price * random.uniform(0.95, 1.05), 2),
        ma_200=round(price * random.uniform(0.90, 1.10), 2)
    )

def generate_historical_data(symbol: str, days: int = 90) -> List[HistoricalData]:
    """Generate mock historical data"""
    stock = next((s for s in MOCK_STOCKS if s["symbol"] == symbol), None)
    if not stock:
        return []
    
    base_price = stock["price"]
    data = []
    current_date = datetime.now(timezone.utc)
    
    for i in range(days, 0, -1):
        date = (current_date - timedelta(days=i)).strftime("%Y-%m-%d")
        # Generate realistic OHLC data
        variation = random.uniform(0.97, 1.03)
        open_price = base_price * variation
        high_price = open_price * random.uniform(1.00, 1.03)
        low_price = open_price * random.uniform(0.97, 1.00)
        close_price = random.uniform(low_price, high_price)
        
        data.append(HistoricalData(
            date=date,
            open=round(open_price, 2),
            high=round(high_price, 2),
            low=round(low_price, 2),
            close=round(close_price, 2),
            volume=random.randint(1000000, 30000000)
        ))
        base_price = close_price
    
    return data

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
    # Call Emergent auth service to get session data
    try:
        auth_response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        auth_response.raise_for_status()
        session_data = auth_response.json()
    except Exception as e:
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
    results = [
        StockBasic(
            symbol=s["symbol"],
            name=s["name"],
            exchange=s["exchange"],
            sector=s["sector"]
        )
        for s in MOCK_STOCKS
        if query in s["symbol"].lower() or query in s["name"].lower()
    ]
    return results[:10]

@api_router.get("/stocks/all")
async def get_all_stocks():
    """Get all available stocks"""
    return [
        StockBasic(
            symbol=s["symbol"],
            name=s["name"],
            exchange=s["exchange"],
            sector=s["sector"]
        )
        for s in MOCK_STOCKS
    ]

@api_router.get("/stocks/{symbol}", response_model=StockDetail)
async def get_stock_detail(symbol: str):
    """Get detailed stock information"""
    stock = next((s for s in MOCK_STOCKS if s["symbol"] == symbol), None)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return generate_stock_detail(stock)

@api_router.get("/stocks/{symbol}/historical")
async def get_historical_data(symbol: str, days: int = Query(90, ge=1, le=365)):
    """Get historical stock data"""
    stock = next((s for s in MOCK_STOCKS if s["symbol"] == symbol), None)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    return generate_historical_data(symbol, days)

@api_router.get("/market/overview")
async def get_market_overview():
    """Get market indices overview"""
    indices = [
        MarketIndex(name="NIFTY 50", value=22156.75, change=145.30, change_percent=0.66),
        MarketIndex(name="SENSEX", value=73085.20, change=352.90, change_percent=0.49),
        MarketIndex(name="NIFTY Bank", value=47823.65, change=-89.45, change_percent=-0.19),
        MarketIndex(name="NIFTY IT", value=31245.80, change=287.60, change_percent=0.93),
    ]
    return indices

@api_router.get("/screener")
async def screen_stocks(
    min_pe: Optional[float] = None,
    max_pe: Optional[float] = None,
    min_roe: Optional[float] = None,
    sector: Optional[str] = None
):
    """Screen stocks based on criteria"""
    filtered_stocks = MOCK_STOCKS.copy()
    
    if sector:
        filtered_stocks = [s for s in filtered_stocks if s["sector"].lower() == sector.lower()]
    
    results = []
    for stock in filtered_stocks:
        if min_pe and stock.get("pe", 0) < min_pe:
            continue
        if max_pe and stock.get("pe", float('inf')) > max_pe:
            continue
        if min_roe and stock.get("roe", 0) < min_roe:
            continue
        
        results.append(generate_stock_detail(stock))
    
    return results

# Portfolio endpoints
@api_router.get("/portfolio", response_model=List[PortfolioHolding])
async def get_portfolio():
    holdings = await db.portfolio.find({}, {"_id": 0}).to_list(1000)
    
    # Update current prices
    for holding in holdings:
        stock = next((s for s in MOCK_STOCKS if s["symbol"] == holding["symbol"]), None)
        if stock:
            holding["current_price"] = stock["price"]
    
    return holdings

@api_router.post("/portfolio", response_model=PortfolioHolding)
async def add_portfolio_holding(holding: PortfolioHoldingCreate):
    holding_obj = PortfolioHolding(**holding.model_dump())
    
    # Get current price
    stock = next((s for s in MOCK_STOCKS if s["symbol"] == holding.symbol), None)
    if stock:
        holding_obj.current_price = stock["price"]
    
    doc = holding_obj.model_dump()
    await db.portfolio.insert_one(doc)
    return holding_obj

@api_router.delete("/portfolio/{holding_id}")
async def delete_portfolio_holding(holding_id: str):
    result = await db.portfolio.delete_one({"id": holding_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Holding not found")
    return {"message": "Holding deleted successfully"}

@api_router.get("/portfolio/performance")
async def get_portfolio_performance():
    holdings = await db.portfolio.find({}, {"_id": 0}).to_list(1000)
    
    total_invested = 0
    total_current = 0
    
    for holding in holdings:
        stock = next((s for s in MOCK_STOCKS if s["symbol"] == holding["symbol"]), None)
        if stock:
            invested = holding["quantity"] * holding["purchase_price"]
            current = holding["quantity"] * stock["price"]
            total_invested += invested
            total_current += current
    
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
async def get_watchlist():
    items = await db.watchlist.find({}, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/watchlist", response_model=WatchlistItem)
async def add_watchlist_item(item: WatchlistItemCreate):
    item_obj = WatchlistItem(**item.model_dump())
    doc = item_obj.model_dump()
    await db.watchlist.insert_one(doc)
    return item_obj

@api_router.delete("/watchlist/{item_id}")
async def delete_watchlist_item(item_id: str):
    result = await db.watchlist.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return {"message": "Item removed from watchlist"}

# Strategy endpoints
@api_router.get("/strategies", response_model=List[Strategy])
async def get_strategies():
    strategies = await db.strategies.find({}, {"_id": 0}).to_list(1000)
    return strategies

@api_router.post("/strategies", response_model=Strategy)
async def create_strategy(strategy: StrategyCreate):
    strategy_obj = Strategy(**strategy.model_dump())
    doc = strategy_obj.model_dump()
    await db.strategies.insert_one(doc)
    return strategy_obj

@api_router.delete("/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str):
    result = await db.strategies.delete_one({"id": strategy_id})
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