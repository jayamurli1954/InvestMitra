"""
InvestMitra Quantitative & Backtesting API Router
"""

import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

try:
    from backend.backtesting import backtest_strategy, compare_strategies, generate_backtest_recommendations
    from backend.quant.metrics import calculate_comprehensive_metrics
    from backend.analysis import parse_natural_language_backtest
    from backend.market_data import get_pkscreener_technical_scans
except ModuleNotFoundError:
    from backtesting import backtest_strategy, compare_strategies, generate_backtest_recommendations
    from quant.metrics import calculate_comprehensive_metrics
    from analysis import parse_natural_language_backtest
    from market_data import get_pkscreener_technical_scans

router = APIRouter(prefix="/api/quant", tags=["Quantitative Analytics & Backtesting"])


@router.get("/technical-scans")
def run_technical_scans(symbols: Optional[str] = None) -> List[Dict[str, Any]]:
    """Run PKScreener-inspired technical breakout and indicator scan across stocks."""
    sym_list = [s.strip() for s in symbols.split(",")] if symbols else None
    return get_pkscreener_technical_scans(sym_list)


class StrategyCriteriaInput(BaseModel):
    min_pe: Optional[float] = None
    max_pe: Optional[float] = None
    min_roe: Optional[float] = None
    min_rsi: Optional[float] = None
    max_rsi: Optional[float] = None


from pydantic import BaseModel, Field

class BacktestRequest(BaseModel):
    start_date: str = Field(default="2024-01-01", description="Start date in YYYY-MM-DD format", json_schema_extra={"example": "2024-01-01"})
    end_date: str = Field(default="2024-06-30", description="End date in YYYY-MM-DD format", json_schema_extra={"example": "2024-06-30"})
    initial_capital: float = Field(default=100000.0, description="Initial capital in INR", json_schema_extra={"example": 100000.0})
    strategy_criteria: Optional[Dict[str, Any]] = Field(default={"min_roe": 15}, description="Filter rules", json_schema_extra={"example": {"min_roe": 15}})
    stocks_to_test: Optional[List[str]] = Field(default=["RELIANCE.NS", "TCS.NS", "INFY.NS"], description="List of stock tickers", json_schema_extra={"example": ["RELIANCE.NS", "TCS.NS", "INFY.NS"]})


class NLBacktestRequest(BaseModel):
    prompt: str = Field(default="Strategy with min 15% ROE and 20 EMA crossover", json_schema_extra={"example": "Strategy with min 15% ROE and 20 EMA crossover"})


@router.get("/backtest")
def get_backtest_info(
    start_date: str = "2024-01-01",
    end_date: str = "2024-06-30",
    initial_capital: float = 100000.0
) -> Dict[str, Any]:
    """Browser GET preview for backtesting engine."""
    results = backtest_strategy(
        strategy_criteria={"min_roe": 15},
        start_date=start_date,
        end_date=end_date,
        initial_capital=initial_capital,
        stocks_to_test=["RELIANCE.NS", "TCS.NS", "INFY.NS"]
    )
    recommendations = generate_backtest_recommendations(results)
    results["recommendations"] = recommendations
    return results


@router.post("/backtest")
def run_backtest(req: BacktestRequest) -> Dict[str, Any]:
    """Execute deterministic backtest over historical period with Indian transaction costs."""
    start = req.start_date if req.start_date and req.start_date != "string" else "2024-01-01"
    end = req.end_date if req.end_date and req.end_date != "string" else "2024-06-30"
    stocks = [s for s in (req.stocks_to_test or []) if s != "string"] or ["RELIANCE.NS", "TCS.NS", "INFY.NS"]
    
    try:
        results = backtest_strategy(
            strategy_criteria=req.strategy_criteria or {},
            start_date=start,
            end_date=end,
            initial_capital=req.initial_capital,
            stocks_to_test=stocks
        )
        recommendations = generate_backtest_recommendations(results)
        results["recommendations"] = recommendations
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid backtest request: {str(e)}")


@router.post("/backtest/parse-prompt")
def parse_prompt(req: NLBacktestRequest) -> Dict[str, Any]:
    """Parse natural language query into structured backtest strategy rules."""
    return parse_natural_language_backtest(req.prompt)


@router.post("/compare-strategies")
def run_strategy_comparison(
    strategies: List[Dict[str, Any]],
    start_date: str = Query(...),
    end_date: str = Query(...),
    initial_capital: float = Query(100000.0)
) -> List[Dict[str, Any]]:
    """Compare multiple backtest strategies side-by-side."""
    return compare_strategies(strategies, start_date, end_date, initial_capital)
