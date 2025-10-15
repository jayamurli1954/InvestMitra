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
from performance import generate_performance_summary
from backtesting import backtest_strategy, calculate_strategy_score, generate_backtest_recommendations
from ai_insights import generate_portfolio_optimization, generate_predictive_insights, generate_stock_analysis

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# CORS configuration
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')

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
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
                stock_data = await get_stock_info(holding["symbol"])
                current_price = stock_data.get("current_price", 0)
                holding_value = holding["quantity"] * current_price
                current_value += holding_value
                
                holdings_with_prices.append({
                    **holding,
                    "current_price": current_price,
                    "current_value": holding_value
                })
            except Exception as e:
                logger.error(f"Error fetching price for {holding['symbol']}: {e}")
                holdings_with_prices.append(holding)
        
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()