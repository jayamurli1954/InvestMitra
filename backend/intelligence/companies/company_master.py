"""
InvestMitra Company Master Module
Manages canonical profiles for Indian listed companies across NSE, BSE, and ISIN.
"""

from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

# Primary Instrument Index Database (In-Memory Reference Baseline)
INDIAN_COMPANY_MASTER: Dict[str, Dict[str, Any]] = {
    "RELIANCE": {
        "company_name": "Reliance Industries Limited",
        "nse_symbol": "RELIANCE.NS",
        "bse_code": "500325",
        "isin": "INE002A01018",
        "sector": "Oil Gas & Consumable Fuels",
        "industry": "Refineries & Petrochemicals",
        "sub_industry": "Integrated Energy & Telecommunication",
        "market_cap_category": "LARGE_CAP",
        "key_business_segments": ["Oil to Chemicals (O2C)", "Jio Platforms (Telecom)", "Reliance Retail"]
    },
    "TCS": {
        "company_name": "Tata Consultancy Services Limited",
        "nse_symbol": "TCS.NS",
        "bse_code": "532540",
        "isin": "INE467B01029",
        "sector": "Information Technology",
        "industry": "IT - Software",
        "sub_industry": "Global IT Services & Consulting",
        "market_cap_category": "LARGE_CAP",
        "key_business_segments": ["BFSI", "Retail & CPG", "Communication & Media", "Manufacturing"]
    },
    "INFY": {
        "company_name": "Infosys Limited",
        "nse_symbol": "INFY.NS",
        "bse_code": "500209",
        "isin": "INE009A01021",
        "sector": "Information Technology",
        "industry": "IT - Software",
        "sub_industry": "Global IT Services",
        "market_cap_category": "LARGE_CAP",
        "key_business_segments": ["Financial Services", "Retail", "Communication", "Energy & Utilities"]
    },
    "INDIGO": {
        "company_name": "InterGlobe Aviation Limited (IndiGo)",
        "nse_symbol": "INDIGO.NS",
        "bse_code": "539448",
        "isin": "INE646L01027",
        "sector": "Aviation & Logistics",
        "industry": "Airlines",
        "sub_industry": "Passenger Air Transportation",
        "market_cap_category": "LARGE_CAP",
        "key_business_segments": ["Domestic Passenger Air", "International Passenger Air", "Cargo Services"]
    },
    "ASIANPAINT": {
        "company_name": "Asian Paints Limited",
        "nse_symbol": "ASIANPAINT.NS",
        "bse_code": "500820",
        "isin": "INE021A01026",
        "sector": "Consumer Durables",
        "industry": "Paints & Coatings",
        "sub_industry": "Decorative & Industrial Paints",
        "market_cap_category": "LARGE_CAP",
        "key_business_segments": ["Decorative Paints", "Industrial Coatings", "Home Decor"]
    }
}


def get_company_by_symbol(symbol: str) -> Optional[Dict[str, Any]]:
    """Lookup canonical company profile by symbol or ticker."""
    clean_sym = symbol.upper().replace(".NS", "").replace(".BO", "").strip()
    return INDIAN_COMPANY_MASTER.get(clean_sym)


def search_companies(query: str) -> List[Dict[str, Any]]:
    """Search company master by name, symbol, or industry."""
    q = query.lower()
    results = []
    for sym, comp in INDIAN_COMPANY_MASTER.items():
        if (q in sym.lower() or 
            q in comp["company_name"].lower() or 
            q in comp["sector"].lower() or 
            q in comp["industry"].lower()):
            results.append({"symbol": sym, **comp})
    return results
