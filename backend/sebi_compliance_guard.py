import re

# Prohibited directive trading terms under SEBI RA/RIA guidelines
PROHIBITED_WORDS = [
    (r'\bBUY\b', 'FAVORABLE OUTLOOK'),
    (r'\bSTRONG BUY\b', 'HIGH FINANCIAL STRENGTH'),
    (r'\bSELL\b', 'RISK MITIGATION'),
    (r'\bSTRONG SELL\b', 'ELEVATED RISK LEVEL'),
    (r'\bHOLD\b', 'NEUTRAL POSITION'),
    (r'\bACCUMULATE\b', 'FAVORABLE ALLOCATION'),
    (r'\bREDUCE\b', 'ELEVATED VALUATION / RISK'),
    (r'\bTARGET PRICE\b', 'VALUATION PROJECTION'),
    (r'\bSTOP-LOSS\b', 'RISK SUPPORT LEVEL'),
    (r'\bSTOP LOSS\b', 'RISK SUPPORT LEVEL'),
    (r'\bBOOK PROFITS\b', 'PORTFOLIO REBALANCING'),
    (r'\bENTRY POINT\b', 'SUPPORT ZONE'),
    (r'\bEXIT POINT\b', 'RESISTANCE ZONE'),
]

SEBI_DISCLAIMER_TEXT = (
    "Disclaimer: InvestMitra is a financial analytics and research platform for educational purposes only. "
    "We are not a SEBI-registered Research Analyst or Investment Adviser. All metrics, ratios, and AI insights "
    "represent factual data analysis and do not constitute investment advice or buy/sell recommendations."
)

def sanitize_text(text: str) -> str:
    """
    Sanitize raw AI or model generated text by replacing directive advice language
    with SEBI-compliant factual analytical terminology.
    """
    if not text or not isinstance(text, str):
        return text

    sanitized = text
    for pattern, replacement in PROHIBITED_WORDS:
        sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)

    return sanitized


def sanitize_signal_output(signal_data: dict) -> dict:
    """
    Transform raw signal model outputs into SEBI-compliant analytical statuses.
    """
    if not isinstance(signal_data, dict):
        return signal_data

    raw_signal = signal_data.get("signal", "").upper()
    
    # Mapping raw signals to analytical statuses
    status_map = {
        "ACCUMULATE": "FAVORABLE OUTLOOK",
        "HOLD": "BALANCED POSITION",
        "REDUCE": "ELEVATED RISK LEVEL",
        "BUY": "POSITIVE MOMENTUM",
        "SELL": "HIGH VOLATILITY RISK",
    }
    
    analytical_status = status_map.get(raw_signal, sanitize_text(raw_signal))
    
    # Sanitize bullet points / explanation lists
    positives = [sanitize_text(p) for p in signal_data.get("positives", [])]
    negatives = [sanitize_text(n) for n in signal_data.get("negatives", [])]
    
    result = dict(signal_data)
    result["signal"] = analytical_status
    result["status_type"] = "ANALYTICAL_OBSERVATION"
    result["positives"] = positives
    result["negatives"] = negatives
    result["disclaimer"] = SEBI_DISCLAIMER_TEXT
    
    return result
