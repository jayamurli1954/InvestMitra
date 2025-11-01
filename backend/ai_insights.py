"""
AI-Powered Portfolio Insights Module
Uses Google Gemini LLM to generate personalized investment recommendations 
and portfolio optimization.
"""

import os
import re
import json
import logging
from typing import List, Dict, Any
from dotenv import load_dotenv

# --- NEW GEMINI IMPORTS ---
from google import genai
from google.genai import types
from google.genai.errors import APIError 
# --------------------------

load_dotenv()
logger = logging.getLogger(__name__)

# --- GEMINI CLIENT INITIALIZATION ---
# The client automatically looks for the GEMINI_API_KEY environment variable.
# Ensure your actual, private key is set in the .env file.
client = None
try:
    client = genai.Client()
    logger.info("Gemini client initialized successfully.")
except Exception as e:
    logger.error(f"Error initializing Gemini client: {e}")
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
        r'```json\s*(\s*\{.*?\}\s*)\s*```',
        r'```\s*(\s*\{.*?\}\s*)\s*```',
        r'(\s*\{.*?\}\s*)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            # Return the captured group (the JSON content itself)
            return match.group(1).strip()
    
    # If no pattern matches, return the original text (will likely fail json.loads)
    return text


def format_holdings(holdings: List[Dict]) -> str:
    """Format detailed holdings for AI context"""
    if not holdings:
        return "No holdings data available."
    
    lines = ["| Asset | Symbol | Current Price | Weight (%) |"]
    lines.append("|:---|:---|:---:|:---:|")
    for h in holdings:
        # Use .get() with a default value to prevent KeyError if data is incomplete
        symbol = h.get('symbol', 'N/A')
        name = h.get('name', 'N/A')
        price = h.get('current_price', 0.0)
        # Assuming weight is between 0 and 1, format as percentage
        weight = h.get('weight', 0.0) * 100
        lines.append(f"| {name} | {symbol} | ₹{price:.2f} | {weight:.1f}% |")
    return "\n".join(lines)


def format_sector_allocation(allocation: Dict[str, float]) -> str:
    """Format sector allocation for AI context"""
    if not allocation:
        return "No sector allocation data available."
    
    lines = ["| Sector | Allocation (%) |"]
    lines.append("|:---|:---:|")
    # Sort by largest allocation first
    sorted_alloc = sorted(allocation.items(), key=lambda item: item[1], reverse=True)
    
    for sector, percent in sorted_alloc:
        lines.append(f"| {sector} | {percent:.1f}% |")
    return "\n".join(lines)


# NOTE: Since the Gemini API does not have a native async client in the standard SDK 
# like OpenAI's AsyncOpenAI, we keep this function as synchronous for simplicity 
# unless you decide to switch to an external library like `httpx` for async wrappers.
# We'll use the synchronous client here, which is fine for development.
def generate_portfolio_optimization(
    portfolio_data: Dict[str, Any],
    analytics_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate AI-powered portfolio optimization suggestions using Google Gemini.
    """
    
    if client is None:
        logger.error("Gemini client is not available.")
        return {
            "optimization_suggestions": {
                "rebalancing": ["AI insights unavailable - Gemini client failed to initialize."],
                "diversification": [],
                "risk_management": []
            },
            "raw_analysis": "Client Error."
        }
        
    user_name = portfolio_data.get("user_name", "Investor")
    holdings_table = format_holdings(portfolio_data.get("portfolio", []))
    sector_table = format_sector_allocation(analytics_data.get("sector_allocation", {}))
    risk_summary = analytics_data.get("summary", "No official summary available.")
    
    # --- PROMPT DEFINITION ---
    
    system_prompt = (
        "You are an expert Certified Financial Analyst (CFA). Your task is to provide portfolio "
        "optimization and risk management advice. Analyze the provided portfolio data and "
        "analytics. Your response MUST be a single, valid JSON object enclosed in a markdown code block, "
        "and nothing else. Strictly use the JSON schema provided in the user request."
    )
    
    user_prompt = f"""
    ### Investor Profile
    Investor Name: {user_name}
    
    ### Portfolio Summary
    Overall Risk Profile: {risk_summary}
    
    ### Current Holdings
    {holdings_table}
    
    ### Sector Allocation
    {sector_table}
    
    ### Request
    Based on the data above, provide the following:
    
    1. A concise, professional summary of the portfolio's current strengths and weaknesses.
    2. Specific, actionable rebalancing suggestions to improve diversification and risk-adjusted returns.
    3. Suggested risk management actions.
    
    ### Output JSON Schema
    ```json
    {{
        "summary": "Concise summary of strengths and weaknesses (max 3 sentences).",
        "optimization_suggestions": {{
            "rebalancing": [
                "Actionable suggestion 1 (e.g., 'Sell 5% of Reliance to reduce concentration risk').",
                "Actionable suggestion 2.",
                "Actionable suggestion 3."
            ],
            "diversification": [
                "Diversification suggestion 1 (e.g., 'Consider adding an international equity ETF').",
                "Diversification suggestion 2."
            ],
            "risk_management": [
                "Risk management action 1 (e.g., 'Set a 10% trailing stop-loss on HDFC').",
                "Risk management action 2."
            ]
        }},
        "raw_analysis": "Optional detailed internal analysis used to generate the suggestions."
    }}
    ```
    Generate the complete, single JSON object now.
    """
    
    # --- GEMINI API CALL ---
    try:
        # 1. Call the Gemini API
        response = client.models.generate_content(
            model='gemini-2.5-flash',  # Fast, efficient, and capable for this task
            contents=full_prompt,  # Using the combined prompt
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
            )
        )
        
        # 2. Extract and Validate JSON
        raw_text = response.text
        json_str = extract_json_from_markdown(raw_text)
        
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON from AI response. Raw Text: {raw_text[:500]}")
            return {
                "summary": "Error: AI output not in valid JSON format.",
                "optimization_suggestions": {"rebalancing": [f"Raw text start: {raw_text[:50]}"], "diversification": [], "risk_management": []},
                "raw_analysis": raw_text
            }

    except APIError as e:
        logger.error(f"Gemini API Error: {e}")
        return {
            "summary": "Error: Failed to connect to Gemini API.",
            "optimization_suggestions": {"rebalancing": [f"API Error: {e.status_code} - {e.message}"]},
            "raw_analysis": str(e)
        }
    except Exception as e:
        logger.error(f"Unexpected error during Gemini call: {e}")
        return {
            "summary": "Error: Unexpected internal error.",
            "optimization_suggestions": {"rebalancing": [f"Internal error: {str(e)}"]},
            "raw_analysis": str(e)
        }


# ==============================================================================
# PLACEHOLDER FUNCTIONS (Can be implemented similarly)
# ==============================================================================

def generate_predictive_insights(portfolio_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generates AI-powered predictions about portfolio trends for the next 3 months."""
    return {
        "prediction": "Feature not fully implemented yet, awaiting full data feed.",
        "raw_analysis": "Placeholder"
    }

def generate_stock_analysis(symbol: str) -> Dict[str, Any]:
    """Generates a detailed AI analysis for a single stock."""
    return {
        "analysis": f"Detailed analysis for {symbol} not implemented yet.",
        "raw_analysis": "Placeholder"
    }