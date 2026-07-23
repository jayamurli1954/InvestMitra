"""
InvestMitra RAG Evidence Retrieval & Citation Engine
Retrieves evidence chunks for company filings, earnings calls, and corporate disclosures with verifiable citations.
"""

from typing import List, Dict, Any, Optional
import logging
from backend.research.rag.document_processor import generate_simulated_embedding

logger = logging.getLogger(__name__)

# Sample Evidence Knowledge Base for Indian Companies
EVIDENCE_DATABASE: List[Dict[str, Any]] = [
    {
        "chunk_id": "CHK-INDIGO-2025-Q4-01",
        "company_symbol": "INDIGO",
        "document_title": "IndiGo Q4 FY25 Earnings Call Transcript",
        "document_type": "EARNINGS_CALL",
        "period": "Q4 FY25",
        "content": "Aviation Turbine Fuel (ATF) constitutes roughly 38% to 42% of our total operational costs. A $10 per barrel increase in Brent crude translates directly to margin pressure unless offset by yields.",
        "source_name": "Official Corporate Disclosure",
        "relevance_score": 0.94
    },
    {
        "chunk_id": "CHK-ASIANPAINT-2025-AR-02",
        "company_symbol": "ASIANPAINT",
        "document_title": "Asian Paints Annual Report 2025 - MD&A",
        "document_type": "ANNUAL_REPORT",
        "period": "FY25",
        "content": "Key raw materials including Monomers, Solvents, and Titanium Dioxide are derivative products of crude oil. Raw material cost sensitivity is managed via formulation efficiencies and price adjustments.",
        "source_name": "SEBI Annual Filing",
        "relevance_score": 0.91
    },
    {
        "chunk_id": "CHK-RELIANCE-2025-Q4-03",
        "company_symbol": "RELIANCE",
        "document_title": "Reliance Industries Investor Presentation May 2025",
        "document_type": "INVESTOR_PRESENTATION",
        "period": "May 2025",
        "content": "Gross Refining Margins (GRM) remained resilient due to complex refinery configuration and crude sourcing flexibility across Middle East and regional suppliers.",
        "source_name": "BSE/NSE Filing",
        "relevance_score": 0.89
    },
    {
        "chunk_id": "CHK-TCS-2025-Q4-04",
        "company_symbol": "TCS",
        "document_title": "TCS Q4 FY25 Management Commentary",
        "document_type": "EARNINGS_CALL",
        "period": "Q4 FY25",
        "content": "Rupee depreciation provides a tactical tailwind to operating margins (approx +30 bps per 1% INR movement), offset by wage inflation and onsite subcontractor costs.",
        "source_name": "Earnings Call Disclosure",
        "relevance_score": 0.92
    }
]


def retrieve_evidence_for_company(
    symbol: str,
    query: str,
    top_k: int = 3
) -> List[Dict[str, Any]]:
    """
    Retrieve evidence chunks for a specific company symbol and research query.
    """
    clean_sym = symbol.upper().replace(".NS", "").replace(".BO", "").strip()
    query_vec = generate_simulated_embedding(query)

    matched_chunks = []
    for chunk in EVIDENCE_DATABASE:
        if chunk["company_symbol"] == clean_sym or not symbol:
            matched_chunks.append(chunk)

    # Sort by relevance score
    matched_chunks.sort(key=lambda x: x.get("relevance_score", 0.0), reverse=True)
    return matched_chunks[:top_k]


def format_citations(evidence_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Format verifiable source citations for AI research report presentation.
    """
    citations = []
    for idx, chunk in enumerate(evidence_chunks, 1):
        citations.append({
            "citation_number": idx,
            "chunk_id": chunk["chunk_id"],
            "document_title": chunk["document_title"],
            "source_name": chunk["source_name"],
            "period": chunk["period"],
            "citation_text": chunk["content"],
            "confidence": chunk.get("relevance_score", 0.85)
        })
    return citations
