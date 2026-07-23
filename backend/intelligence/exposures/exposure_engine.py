"""
InvestMitra Company Exposure Engine
Maps structural exposure dimensions (Commodity, Currency, Geography, Interest Rate, Supply Chain) for Indian companies.
"""

from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

# Structured Company Exposure Mapping Database
COMPANY_EXPOSURE_DATABASE: Dict[str, List[Dict[str, Any]]] = {
    "RELIANCE": [
        {
            "exposure_type": "COMMODITY",
            "target_entity": "Brent Crude Oil",
            "exposure_level": "HIGH",
            "direction": "MIXED",
            "financial_sensitivity": "Refining margins expand with high crude spreads; O2C petrochemical raw material costs increase.",
            "hedging_policy": "Active commodity swaps and inventory hedging"
        },
        {
            "exposure_type": "CURRENCY",
            "target_entity": "USD/INR",
            "exposure_level": "HIGH",
            "direction": "POSITIVE",
            "financial_sensitivity": "Net dollar exporter in O2C segment; USD strength boosts INR revenue.",
            "hedging_policy": "Natural hedge through USD debt and export revenues"
        }
    ],
    "INDIGO": [
        {
            "exposure_type": "COMMODITY",
            "target_entity": "ATF / Crude Oil",
            "exposure_level": "HIGH",
            "direction": "NEGATIVE",
            "financial_sensitivity": "Aviation Turbine Fuel (ATF) represents ~40% of total operating expenses. 10% crude spike reduces operating margin by ~2.2%.",
            "hedging_policy": "Limited fuel hedging under current policy; reliance on price surcharges"
        },
        {
            "exposure_type": "CURRENCY",
            "target_entity": "USD/INR",
            "exposure_level": "HIGH",
            "direction": "NEGATIVE",
            "financial_sensitivity": "Aircraft lease liabilities and maintenance costs denominated in USD. Rupee depreciation increases cash outflow.",
            "hedging_policy": "Partial currency forwards"
        }
    ],
    "ASIANPAINT": [
        {
            "exposure_type": "COMMODITY",
            "target_entity": "Crude Derivatives / Titanium Dioxide",
            "exposure_level": "HIGH",
            "direction": "NEGATIVE",
            "financial_sensitivity": "Monomers and solvent raw materials are crude derivatives. 10% crude increase impacts gross margin by ~1.8%.",
            "hedging_policy": "Strategic inventory buffer and retail pricing adjustments"
        }
    ],
    "TCS": [
        {
            "exposure_type": "CURRENCY",
            "target_entity": "USD/INR & EUR/INR",
            "exposure_level": "HIGH",
            "direction": "POSITIVE",
            "financial_sensitivity": ">50% revenue from North America in USD; INR depreciation increases top-line margin.",
            "hedging_policy": "Rolling 12-month currency forward contracts"
        },
        {
            "exposure_type": "GEOGRAPHY",
            "target_entity": "US & European IT Spending",
            "exposure_level": "HIGH",
            "direction": "POSITIVE",
            "financial_sensitivity": "Macro slowdown in US/Europe delays discretionary enterprise IT projects.",
            "hedging_policy": "Diversification into Cloud Transformation and Cost Optimization contracts"
        }
    ],
    "INFY": [
        {
            "exposure_type": "CURRENCY",
            "target_entity": "USD/INR",
            "exposure_level": "HIGH",
            "direction": "POSITIVE",
            "financial_sensitivity": "1% USD appreciation expands operating margin by ~30 bps.",
            "hedging_policy": "Layered forward hedges"
        }
    ]
}


def get_company_exposures(symbol: str) -> List[Dict[str, Any]]:
    """Retrieve exposure breakdown for a given company symbol."""
    clean_sym = symbol.upper().replace(".NS", "").replace(".BO", "").strip()
    return COMPANY_EXPOSURE_DATABASE.get(clean_sym, [])


def find_companies_exposed_to(target_entity: str) -> List[Dict[str, Any]]:
    """Find all companies with structural exposure to a specific commodity or macro factor (e.g. 'Crude Oil', 'USD/INR')."""
    target = target_entity.lower()
    matches = []
    
    for sym, exposures in COMPANY_EXPOSURE_DATABASE.items():
        for exp in exposures:
            if target in exp["target_entity"].lower():
                matches.append({
                    "symbol": sym,
                    **exp
                })
                
    return matches
