# backend/mutual_fund_data.py
import pandas as pd
import os
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Load mutual fund data
def load_mutual_fund_database():
    """Load mutual fund data from AMFI CSV"""
    try:
        csv_path = os.path.join(os.path.dirname(__file__), 'data', 'mutual_funds.csv')
        
        # Read CSV with proper encoding
        df = pd.read_csv(csv_path, encoding='utf-8', delimiter=';')
        
        # Return as dictionary for quick lookup
        mf_dict = {}
        for idx, row in df.iterrows():
            scheme_code = str(row['Scheme Code']).strip()
            scheme_name = str(row['Scheme Name']).strip()
            nav = float(row['Net Asset Value'])
            
            mf_dict[scheme_code] = {
                'scheme_code': scheme_code,
                'scheme_name': scheme_name,
                'current_nav': nav,
                'last_updated': datetime.now().isoformat()
            }
        
        logger.info(f"Loaded {len(mf_dict)} mutual funds")
        return mf_dict
        
    except Exception as e:
        logger.error(f"Error loading mutual fund data: {e}")
        return {}

# Load database once when module starts
MUTUAL_FUNDS = load_mutual_fund_database()

def search_mutual_funds(query: str, limit: int = 10) -> list:
    """Search for mutual funds by name or code"""
    if not query:
        return []

    query_lower = query.strip().lower()
    if len(query_lower) < 2:
        return []

    scored_results = []

    for code, fund_data in MUTUAL_FUNDS.items():
        scheme_name = fund_data.get('scheme_name', '')
        code_lower = str(code).lower()
        name_lower = str(scheme_name).lower()

        score = 0
        if code_lower == query_lower:
            score = 100
        elif code_lower.startswith(query_lower):
            score = 90
        elif name_lower.startswith(query_lower):
            score = 80
        elif query_lower in name_lower:
            score = 60
        elif query_lower in code_lower:
            score = 50

        if score == 0:
            continue

        # Clean NAV value - handle NaN and infinity
        nav = fund_data.get('current_nav', 0.0)
        try:
            if nav != nav or nav == float('inf') or nav == float('-inf'):
                nav = 0.0
            nav = float(nav)
        except (ValueError, TypeError):
            nav = 0.0

        scored_results.append({
            'scheme_code': str(code),
            'scheme_name': scheme_name,
            'current_nav': nav,
            '_score': score
        })

    scored_results.sort(key=lambda x: (-x['_score'], x['scheme_name']))
    trimmed = scored_results[:limit]
    return [
        {
            'scheme_code': item['scheme_code'],
            'scheme_name': item['scheme_name'],
            'current_nav': item['current_nav']
        }
        for item in trimmed
    ]

def get_mutual_fund(scheme_code: str) -> dict:
    """Get single mutual fund details"""
    return MUTUAL_FUNDS.get(scheme_code, None)

def get_current_nav(scheme_code: str) -> float:
    """Get current NAV for a scheme"""
    fund = MUTUAL_FUNDS.get(scheme_code)
    if fund:
        return fund['current_nav']
    return None 
