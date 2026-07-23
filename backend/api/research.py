"""
InvestMitra Structured Research & Intelligence API Router
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional

try:
    from backend.analysis import generate_committee_analysis, calculate_risk_mandates, generate_portfolio_diagnostics, calculate_berkshire_scorecard
    from backend.governance.compliance import enforce_sebi_compliance
except ModuleNotFoundError:
    from analysis import generate_committee_analysis, calculate_risk_mandates, generate_portfolio_diagnostics, calculate_berkshire_scorecard
    from governance.compliance import enforce_sebi_compliance

router = APIRouter(prefix="/api/research", tags=["Research & Intelligence"])


@router.get("/berkshire-scorecard/{symbol}")
def get_berkshire_scorecard(symbol: str) -> Dict[str, Any]:
    """Calculate Warren Buffett & Charlie Munger value investing scorecard for a stock."""
    try:
        return calculate_berkshire_scorecard(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Berkshire scorecard error: {str(e)}")


@router.get("/committee/{symbol}")
def get_committee_research(symbol: str, name: Optional[str] = None) -> Dict[str, Any]:
    """Fetch multi-perspective research analysis for a given stock symbol."""
    try:
        res = generate_committee_analysis(symbol, name or symbol)
        return enforce_sebi_compliance(res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research generation error: {str(e)}")


@router.post("/portfolio-risk-mandates")
def get_risk_mandates(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate portfolio HHI diversification index and single-asset concentration alert mandates."""
    holdings = payload.get("holdings", [])
    stock_data = payload.get("stock_data", {})
    res = calculate_risk_mandates(holdings, stock_data)
    return enforce_sebi_compliance(res)


@router.post("/portfolio-diagnostics")
def get_diagnostics(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Diagnose portfolio behavioral patterns (cost averaging, concentration)."""
    holdings = payload.get("holdings", [])
    transactions = payload.get("transactions", [])
    diag = generate_portfolio_diagnostics(holdings, transactions)
    return {"diagnostics": enforce_sebi_compliance(diag)}
