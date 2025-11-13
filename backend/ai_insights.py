"""
AI-Powered Portfolio Insights Module
Uses Google Gemini LLM to generate personalized investment recommendations
and portfolio optimization.

FINAL VERSION - November 2, 2025
Model: gemini-2.5-flash (latest & fastest)
"""

import re
import json
import logging
from typing import List, Dict, Any
from config import config, is_ai_enabled

# --- GEMINI IMPORTS ---
from google import genai
from google.genai import types
from google.genai.errors import APIError
# ----------------------

logger = logging.getLogger(__name__)

# --- GEMINI CLIENT INITIALIZATION ---
client = None
GEMINI_API_KEY = config.GEMINI_API_KEY

if is_ai_enabled():
    try:
        if not GEMINI_API_KEY.startswith("AIzaSy"):
            error_msg = f"❌ GEMINI_API_KEY has wrong format: starts with '{GEMINI_API_KEY[:10]}'"
            logger.error(error_msg)
            logger.error("   API key should start with 'AIzaSy'")
        else:
            # Initialize with explicit API key
            client = genai.Client(api_key=GEMINI_API_KEY)
            logger.info("✅ Gemini client initialized successfully")
            logger.info(f"   Using API key: {GEMINI_API_KEY[:10]}...{GEMINI_API_KEY[-4:]}")
            logger.info("   Model: gemini-2.5-flash (latest & fastest)")
    except Exception as e:
        logger.error(f"❌ Error initializing Gemini client: {e}")
        logger.error(f"   Error type: {type(e).__name__}")
        client = None
else:
    logger.info("ℹ️  AI insights disabled - GEMINI_API_KEY not configured")
# ------------------------------------


def extract_json_from_markdown(text: str) -> str:
    """
    Extract JSON content from markdown code blocks or plain text.
    
    Handles formats like:
    - ```json {...}```
    - ``` {...}```
    - {...} (plain JSON)
    """
    patterns = [
        r'```json\s*(\{.*?\})\s*```',
        r'```\s*(\{.*?\})\s*```',
        r'(\{.*?\})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            return match.group(1).strip()
    
    return text


def format_holdings(holdings: List[Dict]) -> str:
    """Format detailed holdings for AI context"""
    if not holdings:
        return "No holdings data available."
    
    lines = ["| Asset | Symbol | Current Price | Weight (%) |"]
    lines.append("|:---|:---|:---:|:---:|")
    
    for h in holdings:
        symbol = h.get('symbol', 'N/A')
        name = h.get('name', symbol)
        price = h.get('current_price', 0.0)
        weight = h.get('weight', 0.0) * 100
        lines.append(f"| {name} | {symbol} | ₹{price:.2f} | {weight:.1f}% |")
    
    return "\n".join(lines)


def format_sector_allocation(allocation: Dict[str, float]) -> str:
    """Format sector allocation for AI context"""
    if not allocation:
        return "No sector allocation data available."
    
    lines = ["| Sector | Allocation (%) |"]
    lines.append("|:---|:---:|")
    
    sorted_alloc = sorted(allocation.items(), key=lambda item: item[1], reverse=True)
    for sector, percent in sorted_alloc:
        lines.append(f"| {sector} | {percent:.1f}% |")
    
    return "\n".join(lines)


def format_performers(performers: List[Dict]) -> str:
    """Format top/bottom performers for AI context"""
    if not performers:
        return "No performance data available."
    
    lines = []
    for p in performers[:3]:
        symbol = p.get('symbol', 'N/A')
        gain = p.get('gain_percent', 0)
        lines.append(f"  - {symbol}: {gain:.2f}%")
    
    return "\n".join(lines)


# ============================================================================
# MAIN FUNCTION: Portfolio Optimization
# ============================================================================

async def generate_portfolio_optimization(
    portfolio_data: Dict[str, Any],
    analytics_data: Dict[str, Any],
    user_profile: Dict[str, Any] # Added user_profile
) -> Dict[str, Any]:
    """
    Generate AI-powered portfolio optimization suggestions using Google Gemini.
    """
    
    if client is None:
        error_msg = "AI insights unavailable - Gemini client not initialized."
        logger.error(f"❌ {error_msg}")
        return {
            "optimization_suggestions": {
                "rebalancing": [error_msg],
                "diversification": [],
                "risk_management": [],
                "tactical_moves": []
            },
            "raw_analysis": "Client initialization error.",
            "error": "client_not_initialized"
        }
    
    # Extract data
    holdings = portfolio_data.get("holdings", [])
    sector_allocation = analytics_data.get("sector_allocation", {})
    risk_profile = user_profile.get('risk_profile', 'Moderate')
    volatility = analytics_data.get('volatility', 0)
    sharpe_ratio = analytics_data.get('sharpe_ratio', 0)
    max_drawdown = analytics_data.get('max_drawdown', 0)

    # Format data for AI
    holdings_table = format_holdings(holdings)
    sector_table = format_sector_allocation(sector_allocation)
    
    system_prompt = (
        "You are a portfolio analysis assistant providing educational information. "
        "Analyze the given Indian stock portfolio based on the user's risk profile and advanced metrics. "
        "Provide general observations in JSON format. This is for educational purposes only, not financial advice. "
        "Respond ONLY with a valid JSON object, no other text."
    )
    
    user_prompt = f"""
Analyze this Indian stock portfolio and provide educational observations.

**User Risk Profile:** {risk_profile}

**Advanced Metrics:**
- Annualized Volatility: {volatility:.2f}%
- Sharpe Ratio: {sharpe_ratio:.2f}
- Max Drawdown: {max_drawdown:.2f}%

**Holdings Summary:**
{len(holdings)} stocks across {len(sector_allocation)} sectors

**Sector Distribution:**
{sector_table}

**Task:**
Provide general observations about this portfolio structure in JSON format, keeping the user's risk profile in mind.

**IMPORTANT:** 
- This is for educational purposes only
- Provide general portfolio structure observations
- Do NOT provide specific buy/sell recommendations
- Tailor observations to the user's risk profile ({risk_profile})

**Output Format (JSON ONLY):**
```json
{{
    "optimization_suggestions": {{
        "rebalancing": [
            "General observation about portfolio balance based on risk profile.",
            "Observation about sector weights."
        ],
        "diversification": [
            "Observation about sector coverage.",
            "Observation about diversification level."
        ],
        "risk_management": [
            "Observation on volatility and max drawdown relative to risk profile.",
            "Comment on concentration risk."
        ],
        "risk_adjusted_performance": [
            "Observation on the Sharpe Ratio.",
            "Comment on whether the returns justify the risk taken."
        ]
    }}
}}
```

Respond with ONLY the JSON object, nothing else.
"""
    
    full_prompt = f"{system_prompt}\n\n{user_prompt}"
    
    # Gemini API call
    try:
        logger.info("🤖 Calling Gemini API for portfolio optimization...")
        
        response = client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=full_prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                top_p=0.9,
                top_k=40,
                max_output_tokens=2048,
            )
        )
        
        # Handle different response formats
        raw_text = None

        try:
            raw_text = response.text
            logger.debug(f"Got Gemini response: {len(raw_text)} chars")
        except Exception as e:
            logger.debug(f"Response .text access failed, trying candidates: {e}")

            # Try alternative access method via candidates
            if hasattr(response, 'candidates') and response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]

                if hasattr(candidate, 'content') and candidate.content:
                    if hasattr(candidate.content, 'parts') and candidate.content.parts:
                        raw_text = candidate.content.parts[0].text
                        logger.debug(f"Got response via candidates: {len(raw_text)} chars")
                    else:
                        logger.error("Gemini response candidate content has no parts")
                else:
                    logger.error("Gemini response candidate has no content")
            else:
                logger.error("Gemini response has no candidates")

        if not raw_text:
            logger.error("Gemini returned empty response after trying all access methods")
            return {
                "optimization_suggestions": {
                    "rebalancing": ["AI returned empty response. This may be due to content filters or API issues."],
                    "diversification": [],
                    "risk_management": [],
                    "tactical_moves": []
                },
                "error": "empty_response"
            }

        logger.debug(f"Processing Gemini response: {len(raw_text)} characters")
        
        json_str = extract_json_from_markdown(raw_text)
        
        try:
            result = json.loads(json_str)
            logger.info("✅ Successfully parsed Gemini response")
            return result
            
        except json.JSONDecodeError as parse_error:
            logger.error(f"❌ JSON parsing failed: {parse_error}")
            logger.error(f"Raw response: {raw_text[:500]}")
            
            return {
                "optimization_suggestions": {
                    "rebalancing": [f"AI response parsing failed. Raw: {raw_text[:100]}"],
                    "diversification": ["Unable to parse AI recommendations"],
                    "risk_management": [],
                    "tactical_moves": []
                },
                "raw_analysis": raw_text,
                "error": "json_parsing_failed"
            }

    except APIError as api_error:
        logger.error(f"❌ Gemini API Error: {api_error}")
        return {
            "optimization_suggestions": {
                "rebalancing": [f"API Error: {api_error.message}"],
                "diversification": [],
                "risk_management": [],
                "tactical_moves": []
            },
            "error": f"api_error_{api_error.status_code}"
        }
        
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}", exc_info=True)
        return {
            "optimization_suggestions": {
                "rebalancing": [f"System error: {str(e)}"],
                "diversification": [],
                "risk_management": [],
                "tactical_moves": []
            },
            "error": "unexpected_error"
        }


# ============================================================================
# FUNCTION 2: Predictive Insights
# ============================================================================

from market_data import get_historical_data

async def generate_predictive_insights(
    portfolio_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate AI-powered predictive insights for portfolio.
    """
    
    if client is None:
        logger.error("❌ Gemini client not available for predictions.")
        return {
            "predictive_insights": {
                "outlook_3m": "AI predictions unavailable.",
                "risks": [],
                "opportunities": [],
                "action_items": []
            },
            "error": "client_not_initialized"
        }
    
    # Dynamically determine market trends
    nifty_hist = get_historical_data('^NSEI', days=90)
    nifty_trend = "Neutral"
    sentiment = "Mixed"
    if len(nifty_hist) > 1:
        start_price = nifty_hist[0]['close']
        end_price = nifty_hist[-1]['close']
        change_pct = ((end_price - start_price) / start_price) * 100
        if change_pct > 5:
            nifty_trend = "Bullish"
            sentiment = "Positive"
        elif change_pct < -5:
            nifty_trend = "Bearish"
            sentiment = "Negative"

    holdings = portfolio_data.get("holdings", [])
    
    holdings_summary = []
    for h in holdings[:10]:
        symbol = h.get('symbol', 'N/A')
        sector = h.get('sector', 'N/A')
        holdings_summary.append(f"- {symbol} ({sector})")
    holdings_text = "\n".join(holdings_summary)
    
    prompt = f"""
As an expert market analyst, provide 3-month predictive insights for this Indian stock portfolio.

**Portfolio Holdings:**
{holdings_text}

**Market Conditions:**
- Nifty 50 Trend (3-Month): {nifty_trend}
- Market Sentiment: {sentiment}

**Output JSON Format:**
```json
{{
    "predictive_insights": {{
        "outlook_3m": "Concise 2-3 sentence forecast for next 3 months",
        "risks": [
            "Major risk 1",
            "Major risk 2",
            "Major risk 3"
        ],
        "opportunities": [
            "Opportunity 1 in held sectors",
            "Opportunity 2"
        ],
        "action_items": [
            "Action to take this month",
            "Action to take next month"
        ]
    }}
}}
```

Generate ONLY the JSON object.
"""
    
    try:
        response = client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.8)
        )
        
        # Handle different response formats
        raw_text = None
        try:
            raw_text = response.text
        except Exception:
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    raw_text = candidate.content.parts[0].text
        
        if not raw_text:
            logger.error("❌ Predictive insights: Gemini returned empty response")
            return {
                "predictive_insights": {
                    "outlook_3m": "Unable to generate forecast at this time.",
                    "risks": ["Please try again"],
                    "opportunities": [],
                    "action_items": []
                },
                "error": "empty_response"
            }
        
        json_str = extract_json_from_markdown(raw_text)
        return json.loads(json_str)
        
    except Exception as e:
        logger.error(f"❌ Predictive insights error: {e}")
        return {
            "predictive_insights": {
                "outlook_3m": "Prediction unavailable due to system error.",
                "risks": ["Unable to assess risks"],
                "opportunities": [],
                "action_items": []
            },
            "error": str(e)
        }


# ============================================================================
# FUNCTION 3: Stock Analysis
# ============================================================================

async def generate_stock_analysis(
    symbol: str,
    stock_data: Dict[str, Any]
) -> str:
    """
    Generate AI-powered analysis for a specific stock.
    """
    
    if client is None:
        return f"Analysis for {symbol} unavailable - AI system offline."
    
    name = stock_data.get('name', symbol)
    sector = stock_data.get('sector', 'N/A')
    price = stock_data.get('current_price', 0)
    pe_ratio = stock_data.get('pe_ratio', 'N/A')
    market_cap = stock_data.get('market_cap', 0)
    change = stock_data.get('change_percent', 0)
    
    prompt = f"""
Provide a brief 3-sentence investment analysis for this Indian stock:

**Stock:** {symbol} - {name}
**Sector:** {sector}
**Price:** ₹{price:.2f} ({change:+.2f}%)
**P/E Ratio:** {pe_ratio}
**Market Cap:** ₹{market_cap/10000000:.2f} Cr

Cover:
1. Valuation perspective (cheap/fair/expensive)
2. Key strength OR weakness
3. Investment stance (Bullish/Neutral/Bearish)

Keep it concise and actionable.
"""
    
    try:
        response = client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=200
            )
        )
        
        # Handle different response formats
        raw_text = None
        try:
            raw_text = response.text
        except Exception:
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    raw_text = candidate.content.parts[0].text
        
        if not raw_text:
            return f"Analysis for {symbol} unavailable - empty response from AI."
        
        return raw_text.strip()
        
    except Exception as e:
        logger.error(f"❌ Stock analysis error for {symbol}: {e}")
        return f"Analysis for {symbol} temporarily unavailable."
