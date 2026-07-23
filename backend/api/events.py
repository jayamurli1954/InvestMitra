"""
InvestMitra Event & Intelligence API Router
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

try:
    from backend.intelligence.events.event_collector import fetch_recent_global_events, get_event_by_id
    from backend.intelligence.events.event_classifier import classify_event_impact_scope
    from backend.intelligence.impact.impact_engine import analyze_event_impact_on_company
    from backend.ai.langgraph.research_graph import InvestMitraResearchGraph
    from backend.governance.compliance import enforce_sebi_compliance
except ModuleNotFoundError:
    from intelligence.events.event_collector import fetch_recent_global_events, get_event_by_id
    from intelligence.events.event_classifier import classify_event_impact_scope
    from intelligence.impact.impact_engine import analyze_event_impact_on_company
    from ai.langgraph.research_graph import InvestMitraResearchGraph
    from governance.compliance import enforce_sebi_compliance

router = APIRouter(prefix="/api/events", tags=["Event & Impact Intelligence"])
graph_orchestrator = InvestMitraResearchGraph()


class EventImpactRequest(BaseModel):
    event_id: str
    company_symbol: str


@router.get("/feed")
def get_event_feed(limit: int = Query(5)) -> List[Dict[str, Any]]:
    """Fetch real-time global event intelligence signals (World Monitor Ingestion)."""
    return fetch_recent_global_events(limit)


@router.get("/{event_id}/scope")
def get_event_scope(event_id: str) -> Dict[str, Any]:
    """Classify event taxonomy and view affected Indian sectors and candidate companies."""
    evt = get_event_by_id(event_id)
    return classify_event_impact_scope(evt)


@router.post("/analyze-company-impact")
def analyze_impact(req: EventImpactRequest) -> Dict[str, Any]:
    """Execute end-to-end impact traversal: Event -> Sector -> Company -> Exposure -> RAG Evidence."""
    try:
        return analyze_event_impact_on_company(req.event_id, req.company_symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Impact analysis error: {str(e)}")


@router.post("/multi-agent-research")
def run_agent_research(req: EventImpactRequest) -> Dict[str, Any]:
    """Execute 6-agent LangGraph workflow for evidence-backed research report generation."""
    try:
        return graph_orchestrator.execute(req.event_id, req.company_symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-agent research error: {str(e)}")
