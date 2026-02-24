"""
AI-Powered Portfolio Insights Module
Uses Google Gemini LLM to generate personalized investment recommendations 
and portfolio optimization.

FINAL VERSION - November 2, 2025
Model: gemini-2.5-flash (latest & fastest)
"""

import os
import re
import json
import logging
from typing import List, Dict, Any
from dotenv import load_dotenv

# --- GEMINI IMPORTS ---
GENAI_IMPORT_ERROR = None
try:
    from google import genai
    from google.genai import types
    try:
        from google.genai.errors import APIError
    except Exception:
        APIError = Exception
except Exception as import_error:
    genai = None
    types = None
    APIError = Exception
    GENAI_IMPORT_ERROR = str(import_error)
# ----------------------

load_dotenv()
logger = logging.getLogger(__name__)

# --- GEMINI CLIENT INITIALIZATION ---
client = None
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "models/gemini-2.5-flash")
if GEMINI_API_KEY is None:
    GEMINI_API_KEY = ""

logger.info("\n" + "="*70)
logger.info("🤖 INITIALIZING GEMINI AI")
logger.info("="*70)

try:
    if GENAI_IMPORT_ERROR:
        error_msg = f"❌ Gemini SDK import failed: {GENAI_IMPORT_ERROR}"
        logger.error(error_msg)
    elif not GEMINI_API_KEY:
        error_msg = "❌ GEMINI_API_KEY not found in environment variables"
        logger.error(error_msg)
        logger.error("   Add GEMINI_API_KEY in Render Environment")
    else:
        # Initialize with explicit API key
        client = genai.Client(api_key=GEMINI_API_KEY)
        success_msg1 = "✅ Gemini client initialized successfully"
        success_msg3 = f"   Model: {GEMINI_MODEL}"
        
        logger.info(success_msg1)
        logger.info(success_msg3)
except Exception as e:
    error_msg1 = f"❌ Error initializing Gemini client: {e}"
    error_msg2 = f"   Error type: {type(e).__name__}"
    
    logger.error(error_msg1)
    logger.error(error_msg2)

if client is not None:
    final_msg = "🎉 ai_insights module loaded - Gemini AI ready!"
    logger.info(final_msg)
else:
    warning_msg1 = "⚠️  ai_insights module loaded - Gemini AI NOT available"
    warning_msg2 = "   Check GEMINI_API_KEY in .env file"
    
    logger.warning(warning_msg1)
    logger.warning(warning_msg2)

logger.info("="*70 + "\n")
# ------------------------------------


def extract_json_from_markdown(text: str) -> str:
    """
    Extract JSON content from Gemini responses that may be wrapped in markdown
    code fences (```json ... ``` or ``` ... ```).

    Uses bracket-counting instead of regex so nested JSON objects are captured
    correctly regardless of depth. The old non-greedy regex .*? would stop at
    the first closing brace, breaking all multi-key responses.
    """
    if not text:
        return text

    # Step 1: Strip markdown code fences (```json or ```)
    stripped = text.strip()
    # Remove opening fence
    for fence in ("```json", "```"):
        if stripped.startswith(fence):
            stripped = stripped[len(fence):].lstrip()
            break
    # Remove closing fence
    if stripped.endswith("```"):
        stripped = stripped[:-3].rstrip()

    # Step 2: Find the outermost { ... } block by bracket counting
    start = stripped.find("{")
    if start == -1:
        return stripped   # No JSON object found — return as-is

    depth = 0
    in_string = False
    escape_next = False
    for i, ch in enumerate(stripped[start:], start=start):
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"' and not escape_next:
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return stripped[start:i + 1]

    # Fallback: return everything from the first brace onward
    return stripped[start:]


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
        "You are an expert Indian portfolio manager and financial analyst. "
        "Analyze the given stock and mutual fund portfolio deeply based on the user's risk profile and advanced metrics. "
        "Provide very specific, actionable, and pinpointed observations in JSON format. Do not use generic statements. "
        "Explicitly name the specific assets (stocks/MFs) and sectors in your recommendations. "
        "Respond ONLY with a valid JSON object, no other text."
    )
    
    user_prompt = f"""
Analyze this Indian stock portfolio and provide specific, actionable insights.

**User Risk Profile:** {risk_profile}

**Advanced Metrics:**
- Annualized Volatility: {volatility:.2f}%
- Sharpe Ratio: {sharpe_ratio:.2f}
- Max Drawdown: {max_drawdown:.2f}%

**Holdings Summary:**
{len(holdings)} stocks across {len(sector_allocation)} sectors

**Detailed Holdings:**
{holdings_table}

**Sector Distribution:**
{sector_table}

**Task:**
Provide pinpointed, actionable optimization suggestions for this portfolio in JSON format. 

**IMPORTANT:** 
- Avoid generalized statements. Be highly specific.
- Explicitly name which specific assets (symbols/companies) or sectors are dragging performance, causing concentration risk, or represent opportunities.
- Suggest whether to hold, buy more, or sell specific positions based on the sector distribution and risk profile.
- Tailor observations strictly to the user's risk profile ({risk_profile}).

**Output Format (JSON ONLY):**
```json
{{
    "optimization_suggestions": {{
        "rebalancing": [
            "Specific recommendation on which exact asset or sector to reduce/increase to balance the portfolio.",
            "Specific observation about a current holding's weight."
        ],
        "diversification": [
            "Specific advice on which sectors are over-represented and which missing sectors to add.",
            "Names of specific holdings that contribute to concentration risk."
        ],
        "risk_management": [
            "Pinpointed suggestion on managing downside risk for specific volatile holdings.",
            "Actionable step to improve max drawdown metrics."
        ],
        "risk_adjusted_performance": [
            "Specific feedback on why the Sharpe Ratio is at its current level, naming the responsible assets.",
            "Actionable step to improve risk-adjusted returns."
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
            model=GEMINI_MODEL,
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
            model=GEMINI_MODEL,
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
            model=GEMINI_MODEL,
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
