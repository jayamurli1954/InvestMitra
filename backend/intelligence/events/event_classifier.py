"""
InvestMitra Event Classifier Module
Classifies raw events by Taxonomy and maps them to affected Indian sectors and exposed companies.
"""

from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

# Sector Sensitivity Taxonomy Matrix for Indian Markets
SECTOR_TAXONOMY_MAP: Dict[str, Dict[str, Any]] = {
    "Brent Crude Oil": {
        "positively_affected_sectors": ["Oil & Gas Upstream (Exploration)"],
        "negatively_affected_sectors": ["Airlines & Logistics", "Paints & Decorative Coatings", "Tyres & Rubber", "Specialty Chemicals"],
        "mixed_affected_sectors": ["Oil Marketing Companies (OMCs)", "Refineries"],
        "exposed_companies": ["INDIGO", "ASIANPAINT", "RELIANCE"]
    },
    "USD Index": {
        "positively_affected_sectors": ["IT Services & Software Exports", "Pharma Exports"],
        "negatively_affected_sectors": ["Import-Dependent Manufacturing", "Capital Goods"],
        "mixed_affected_sectors": ["Metals"],
        "exposed_companies": ["TCS", "INFY", "INDIGO"]
    },
    "Titanium Dioxide": {
        "positively_affected_sectors": [],
        "negatively_affected_sectors": ["Paints & Decorative Coatings"],
        "mixed_affected_sectors": [],
        "exposed_companies": ["ASIANPAINT"]
    }
}


def classify_event_impact_scope(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Classify event, map affected Indian sectors and candidate exposed companies.
    """
    affected_commodities = event.get("affected_commodities", [])
    positively_affected = []
    negatively_affected = []
    mixed_affected = []
    exposed_companies = set()

    for commodity in affected_commodities:
        mapping = SECTOR_TAXONOMY_MAP.get(commodity, {})
        positively_affected.extend(mapping.get("positively_affected_sectors", []))
        negatively_affected.extend(mapping.get("negatively_affected_sectors", []))
        mixed_affected.extend(mapping.get("mixed_affected_sectors", []))
        exposed_companies.update(mapping.get("exposed_companies", []))

    # If no commodity match, fallback taxonomy by event_type
    if not exposed_companies and event.get("event_type") == "GEOPOLITICAL":
        negatively_affected.append("Airlines & Logistics")
        exposed_companies.add("INDIGO")

    return {
        "event_id": event.get("event_id"),
        "title": event.get("title"),
        "event_type": event.get("event_type"),
        "severity": event.get("severity"),
        "positive_sectors": list(set(positively_affected)),
        "negative_sectors": list(set(negatively_affected)),
        "mixed_sectors": list(set(mixed_affected)),
        "candidate_companies": list(exposed_companies)
    }
