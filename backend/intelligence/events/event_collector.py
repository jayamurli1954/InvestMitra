"""
InvestMitra Event Collector Module
Ingests global OSINT, geopolitical developments, macro indicators, and commodity signals (World Monitor Inspiration).
"""

from typing import List, Dict, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Sample Live Global Event Feed Database (World Monitor OSINT Pipeline)
GLOBAL_EVENT_FEED: List[Dict[str, Any]] = [
    {
        "event_id": "EVT-2026-001",
        "title": "Middle East Shipping Tensions Escalate in Strait of Hormuz",
        "summary": "Geopolitical friction in the Middle East triggers concerns of potential maritime crude oil supply disruptions.",
        "event_type": "GEOPOLITICAL",
        "severity": "HIGH",
        "geography": "Middle East",
        "affected_commodities": ["Brent Crude Oil", "Natural Gas"],
        "source_name": "World Monitor OSINT Feed",
        "source_tier": "TIER_4_GLOBAL_NEWS",
        "timestamp": datetime.now(timezone.utc).isoformat()
    },
    {
        "event_id": "EVT-2026-002",
        "title": "US Federal Reserve Signals Interest Rate Pause amid Inflation Data",
        "summary": "US Fed maintains benchmark interest rate corridor, indicating sustained borrowing costs for corporate tech expansion.",
        "event_type": "MONETARY_POLICY",
        "severity": "MODERATE",
        "geography": "United States",
        "affected_commodities": ["USD Index"],
        "source_name": "Global Financial Radar",
        "source_tier": "TIER_3_MACRO_DATA",
        "timestamp": datetime.now(timezone.utc).isoformat()
    },
    {
        "event_id": "EVT-2026-003",
        "title": "Titanium Dioxide & Solvent Supply Squeeze in Asian Markets",
        "summary": "Regional chemical manufacturing halts in East Asia lead to price spikes in key paint raw material inputs.",
        "event_type": "SUPPLY_CHAIN",
        "severity": "MODERATE",
        "geography": "Asia-Pacific",
        "affected_commodities": ["Titanium Dioxide", "Chemical Monomers"],
        "source_name": "Asia Chemical Market Monitor",
        "source_tier": "TIER_4_GLOBAL_NEWS",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
]


def fetch_recent_global_events(limit: int = 5) -> List[Dict[str, Any]]:
    """Fetch latest global event signals from ingestion queue."""
    return GLOBAL_EVENT_FEED[:limit]


def get_event_by_id(event_id: str) -> Dict[str, Any]:
    """Retrieve specific event signal by ID."""
    for evt in GLOBAL_EVENT_FEED:
        if evt["event_id"] == event_id:
            return evt
    return GLOBAL_EVENT_FEED[0]
