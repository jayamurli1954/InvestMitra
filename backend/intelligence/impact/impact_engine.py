"""
InvestMitra Impact Traversal Engine
Executes end-to-end impact chain: Event -> Sector -> Company -> Exposure -> RAG Evidence -> Risk Analysis -> Report.
"""

from typing import Dict, Any, List
import logging

try:
    from backend.intelligence.events.event_collector import get_event_by_id
    from backend.intelligence.events.event_classifier import classify_event_impact_scope
    from backend.intelligence.companies.company_master import get_company_by_symbol
    from backend.intelligence.exposures.exposure_engine import get_company_exposures
    from backend.research.rag.retrieval_engine import retrieve_evidence_for_company, format_citations
    from backend.governance.compliance import enforce_sebi_compliance
except ModuleNotFoundError:
    from intelligence.events.event_collector import get_event_by_id
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


def analyze_event_impact_on_company(
    event_id: str,
    company_symbol: str
) -> Dict[str, Any]:
    """
    Run full evidence-backed impact analysis for a specific event and company.
    """
    event = get_event_by_id(event_id)
    classification = classify_event_impact_scope(event)
    company = get_company_by_symbol(company_symbol) or {"company_name": company_symbol, "sector": "General"}
    
    exposures = get_company_exposures(company_symbol)
    evidence = retrieve_evidence_for_company(company_symbol, event.get("title", ""))
    citations = format_citations(evidence)

    # --- Deterministic baseline (fallback when the LLM is unavailable) ---
    direction = "NEUTRAL / BALANCED"
    magnitude = "MODERATE"
    for exp in exposures:
        if exp.get("exposure_level") == "HIGH":
            direction = exp.get("direction", "MIXED")
            magnitude = "HIGH"
            break

    impact_assessment = {
        "impact_direction": direction,
        "impact_magnitude": magnitude,
        "confidence_score": 0.85,
        "time_horizon": "SHORT_TO_MEDIUM_TERM"
    }
    contrarian_review = {
        "bull_case": f"{company_symbol} exhibits pricing power and operational efficiency to absorb input inflation.",
        "bear_case": f"Prolonged {event.get('title')} could compress gross operating margins over the next 2 quarters.",
        "counter_evidence": "Company management maintains strategic hedging and price adjustment buffers.",
        "thesis_breakers": [
            "Input cost pressure persisting for more than 2 consecutive quarters",
            "Inability to pass through cost increases to end consumers"
        ]
    }
    analysis_source = "DETERMINISTIC_FALLBACK"

    # --- Real LLM analysis, grounded in the structured context above ---
    if generate_event_impact_analysis is not None:
        company_for_llm = {**company, "symbol": company_symbol}
        ai_result = generate_event_impact_analysis(event, company_for_llm, exposures, evidence)
        if ai_result:
            impact_assessment = ai_result.get("impact_assessment", impact_assessment)
            contrarian_review = ai_result.get("contrarian_risk_review", contrarian_review)
            analysis_source = "GEMINI_LLM"

    report = {
        "event_summary": {
            "event_id": event.get("event_id"),
            "title": event.get("title"),
            "event_type": event.get("event_type"),
            "severity": event.get("severity")
        },
        "target_company": {
            "symbol": company_symbol,
            "company_name": company.get("company_name"),
            "sector": company.get("sector")
        },
        "impact_assessment": impact_assessment,
        "structural_exposures": exposures,
        "evidence_citations": citations,
        "contrarian_risk_review": contrarian_review,
        "what_to_monitor": [
            "Relevant commodity / input price benchmarks",
            "Upcoming quarterly management margin commentary",
            "Exchange rate volatility (USD/INR)"
        ],
        "analysis_source": analysis_source
    }

    return enforce_sebi_compliance(report)
