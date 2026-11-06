"""
InvestMitra LangGraph Multi-Agent Research Orchestrator
Coordinates 6 specialist agents: Global Intel, India Market, Company Research, Impact Agent, Risk Agent, and Report Agent.
"""

from typing import Dict, Any, List
import logging

try:
    from backend.intelligence.events.event_collector import fetch_recent_global_events, get_event_by_id
    from backend.intelligence.events.event_classifier import classify_event_impact_scope
    from backend.intelligence.companies.company_master import get_company_by_symbol
    from backend.intelligence.exposures.exposure_engine import get_company_exposures
    from backend.research.rag.retrieval_engine import retrieve_evidence_for_company, format_citations
    from backend.governance.compliance import enforce_sebi_compliance
except ModuleNotFoundError:
    from intelligence.events.event_collector import fetch_recent_global_events, get_event_by_id
    from intelligence.events.event_classifier import classify_event_impact_scope
    from intelligence.companies.company_master import get_company_by_symbol
    from intelligence.exposures.exposure_engine import get_company_exposures
    from research.rag.retrieval_engine import retrieve_evidence_for_company, format_citations
    from governance.compliance import enforce_sebi_compliance

try:
    from backend.ai_insights import generate_event_impact_analysis
except ModuleNotFoundError:
    try:
        from ai_insights import generate_event_impact_analysis
    except Exception:
        generate_event_impact_analysis = None

logger = logging.getLogger(__name__)


class AgentState:
    """Shared State Object for LangGraph Multi-Agent Workflow."""

    def __init__(self, event_id: str, company_symbol: str):
        self.event_id = event_id
        self.company_symbol = company_symbol
        self.event_data: Dict[str, Any] = {}
        self.classification_data: Dict[str, Any] = {}
        self.company_profile: Dict[str, Any] = {}
        self.exposures: List[Dict[str, Any]] = []
        self.evidence_chunks: List[Dict[str, Any]] = []
        self.citations: List[Dict[str, Any]] = []
        self.impact_analysis: Dict[str, Any] = {}
        self.risk_review: Dict[str, Any] = {}
        self.final_report: Dict[str, Any] = {}


class GlobalIntelligenceAgent:
    def run(self, state: AgentState) -> None:
        logger.info("[GlobalIntelAgent] Ingesting global signal...")
        state.event_data = get_event_by_id(state.event_id)


class IndiaMarketAgent:
    def run(self, state: AgentState) -> None:
        logger.info("[IndiaMarketAgent] Classifying Indian sector taxonomy...")
        state.classification_data = classify_event_impact_scope(state.event_data)


class CompanyResearchAgent:
    def run(self, state: AgentState) -> None:
        logger.info("[CompanyResearchAgent] Fetching profile, exposures, and RAG evidence...")
        state.company_profile = get_company_by_symbol(state.company_symbol) or {"company_name": state.company_symbol}
        state.exposures = get_company_exposures(state.company_symbol)
        state.evidence_chunks = retrieve_evidence_for_company(state.company_symbol, state.event_data.get("title", ""))
        state.citations = format_citations(state.evidence_chunks)


class EventImpactAgent:
    def run(self, state: AgentState) -> None:
        logger.info("[EventImpactAgent] Analyzing exposure impact...")

        # Deterministic baseline (used if the LLM is unavailable)
        direction = "NEUTRAL / BALANCED"
        magnitude = "MODERATE"
        for exp in state.exposures:
            if exp.get("exposure_level") == "HIGH":
                direction = exp.get("direction", "MIXED")
                magnitude = "HIGH"
                break
        state.impact_analysis = {
            "direction": direction,
            "magnitude": magnitude,
            "confidence": 0.85,
            "analysis_source": "DETERMINISTIC_FALLBACK"
        }

        # Real LLM analysis grounded in event + exposures + evidence
        if generate_event_impact_analysis is not None:
            company_for_llm = {**(state.company_profile or {}), "symbol": state.company_symbol}
            ai_result = generate_event_impact_analysis(
                state.event_data, company_for_llm, state.exposures, state.evidence_chunks
            )
            if ai_result:
                assessment = ai_result.get("impact_assessment", {})
                state.impact_analysis = {
                    "direction": assessment.get("impact_direction", direction),
                    "magnitude": assessment.get("impact_magnitude", magnitude),
                    "confidence": assessment.get("confidence_score", 0.85),
                    "rationale": assessment.get("rationale"),
                    "analysis_source": "GEMINI_LLM"
                }
                # Hand the risk review to the contrarian agent so it needn't re-call the LLM
                state.risk_review = ai_result.get("contrarian_risk_review", {})


class ContrarianRiskAgent:
    def run(self, state: AgentState) -> None:
        logger.info("[ContrarianRiskAgent] Challenging assumptions & identifying thesis breakers...")
        # Prefer the LLM-generated review produced by EventImpactAgent, if present
        if state.risk_review:
            return
        state.risk_review = {
            "bull_case": f"{state.company_symbol} pricing power buffers near-term cost pressures.",
            "bear_case": "Prolonged input-cost spikes compress operating margin over coming quarters.",
            "counter_evidence": "Company management maintains active hedging and price adjustment mechanisms.",
            "thesis_breakers": [
                "Input price spike persisting > 2 quarters",
                "Demand destruction in core retail/domestic segment"
            ]
        }


class ResearchReportAgent:
    def run(self, state: AgentState) -> Dict[str, Any]:
        logger.info("[ReportAgent] Synthesizing final evidence-backed research report...")
        report = {
            "title": f"InvestMitra Research Report: {state.company_symbol} - {state.event_data.get('title')}",
            "event": state.event_data,
            "company": state.company_profile,
            "impact": state.impact_analysis,
            "exposures": state.exposures,
            "citations": state.citations,
            "risk_review": state.risk_review,
            "monitoring_checkpoints": [
                "Track commodity benchmark indices",
                "Monitor Q1 margin guidance commentary"
            ]
        }
        state.final_report = enforce_sebi_compliance(report)
        return state.final_report


class InvestMitraResearchGraph:
    """LangGraph Agent Workflow Execution Topology."""

    def __init__(self):
        self.global_agent = GlobalIntelligenceAgent()
        self.india_agent = IndiaMarketAgent()
        self.company_agent = CompanyResearchAgent()
        self.impact_agent = EventImpactAgent()
        self.risk_agent = ContrarianRiskAgent()
        self.report_agent = ResearchReportAgent()

    def execute(self, event_id: str, company_symbol: str) -> Dict[str, Any]:
        state = AgentState(event_id, company_symbol)
        
        self.global_agent.run(state)
        self.india_agent.run(state)
        self.company_agent.run(state)
        self.impact_agent.run(state)
        self.risk_agent.run(state)
        return self.report_agent.run(state)
