"""
AI-Powered Portfolio Insights Module
Uses OpenAI LLM to generate personalized investment recommendations and portfolio optimization
"""

import os
import re
import json
import logging
from typing import List, Dict, Any
import asyncio
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

def extract_json_from_markdown(text: str) -> str:
    """
    Extract JSON content from markdown code blocks
    
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
            return match.group(1)
    
    return text

async def generate_portfolio_optimization(
    portfolio_data: Dict[str, Any],
    analytics_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate AI-powered portfolio optimization suggestions using OpenAI
    """
    
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment variables")
        return {
            "optimization_suggestions": {
                "rebalancing": ["AI insights unavailable - API key not configured"],
                "diversification": [],
                "risk_management": [],
                "tactical_moves": []
            },
            "error": "API key not configured"
        }
    
    context = f"""
    You are an expert investment advisor analyzing an Indian stock portfolio.
    
    PORTFOLIO OVERVIEW:
    - Total Holdings: {len(portfolio_data.get('holdings', []))}
    - Total Value: ₹{analytics_data.get('total_value', 0):,.2f}
    - Diversification Score: {analytics_data.get('diversification_score', 0)}/10
    
    SECTOR ALLOCATION:
    {format_sector_allocation(analytics_data.get('sector_allocation', {}))}
    
    TOP PERFORMERS:
    {format_performers(analytics_data.get('top_performers', []))}
    
    BOTTOM PERFORMERS:
    {format_performers(analytics_data.get('bottom_performers', []))}
    
    RISK CONCENTRATION:
    {format_risk_concentration(portfolio_data.get('holdings', []))}
    
    Based on this portfolio, provide:
    1. **Rebalancing Recommendations** (3-4 specific actions)
    2. **Sector Diversification Advice** (where to add/reduce exposure)
    3. **Risk Management Suggestions** (concentration risks)
    4. **Tactical Allocation Changes** (short-term adjustments)
    
    Format your response as JSON with keys: rebalancing, diversification, risk_management, tactical_moves
    Keep recommendations specific, actionable, and focused on Indian market conditions.
    Make each array have at least 2-3 items.
    """
    
    try:
        client = AsyncOpenAI(api_key=api_key)
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert Indian stock market portfolio advisor providing actionable investment advice. Always respond with valid JSON."
                },
                {
                    "role": "user",
                    "content": context
                }
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        # Extract response text
        response_text = response.choices[0].message.content
        
        # Extract JSON from markdown formatting if present
        json_str = extract_json_from_markdown(response_text)
        
        # Parse response
        try:
            insights = json.loads(json_str)
        except json.JSONDecodeError as parse_error:
            logger.warning(f"JSON parsing error: {parse_error}")
            logger.info(f"Raw response: {response_text[:500]}")
            # Fallback if not JSON
            insights = {
                "rebalancing": ["Review portfolio allocation", "Rebalance quarterly"],
                "diversification": ["Review sector allocation", "Add underweighted sectors"],
                "risk_management": ["Monitor concentration risk", "Set stop losses"],
                "tactical_moves": ["Consider market conditions", "Review trending sectors"]
            }
        
        return {
            "optimization_suggestions": insights,
            "generated_at": "now"
        }
        
    except Exception as e:
        logger.error(f"Error generating AI insights: {e}")
        return {
            "optimization_suggestions": {
                "rebalancing": ["Unable to generate AI insights at this time"],
                "diversification": [],
                "risk_management": [],
                "tactical_moves": []
            },
            "error": str(e)
        }


async def generate_predictive_insights(
    portfolio_data: Dict[str, Any],
    market_trends: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate predictive analytics and future outlook for portfolio
    """
    
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        return {
            "predictive_insights": {
                "outlook_3m": "AI insights unavailable - API key not configured",
                "risks": [],
                "opportunities": [],
                "action_items": []
            },
            "error": "API key not configured"
        }
    
    context = f"""
    As an expert market analyst, analyze this Indian stock portfolio and provide predictive insights.
    
    PORTFOLIO COMPOSITION:
    {format_holdings_for_prediction(portfolio_data.get('holdings', []))}
    
    CURRENT MARKET ENVIRONMENT:
    - Nifty 50 Trend: {market_trends.get('nifty_trend', 'Neutral')}
    - Market Sentiment: {market_trends.get('sentiment', 'Mixed')}
    
    Provide:
    1. **3-Month Outlook** (Expected portfolio trajectory)
    2. **Risks to Watch** (Top 3 risks affecting this portfolio)
    3. **Opportunities** (Emerging opportunities in held sectors)
    4. **Action Items** (2-3 immediate actions for next month)
    
    Format as JSON with keys: outlook_3m, risks, opportunities, action_items
    Make risks and opportunities arrays with 2-3 items each.
    Be specific to Indian market conditions and the sectors in this portfolio.
    """
    
    try:
        client = AsyncOpenAI(api_key=api_key)
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert market analyst specializing in Indian equities and portfolio forecasting. Always respond with valid JSON."
                },
                {
                    "role": "user",
                    "content": context
                }
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        response_text = response.choices[0].message.content
        json_str = extract_json_from_markdown(response_text)
        
        try:
            insights = json.loads(json_str)
        except json.JSONDecodeError as parse_error:
            logger.warning(f"JSON parsing error: {parse_error}")
            insights = {
                "outlook_3m": "Market conditions suggest cautious optimism",
                "risks": ["Market volatility", "Sector-specific risks", "Regulatory changes"],
                "opportunities": ["Growth in emerging sectors", "Value picks in corrections"],
                "action_items": ["Monitor portfolio regularly", "Rebalance if needed", "Review sector allocation"]
            }
        
        return {
            "predictive_insights": insights,
            "generated_at": "now"
        }
        
    except Exception as e:
        logger.error(f"Error generating predictive insights: {e}")
        return {
            "predictive_insights": {
                "outlook_3m": "Unable to generate forecast at this time",
                "risks": [],
                "opportunities": [],
                "action_items": []
            },
            "error": str(e)
        }


async def generate_stock_analysis(
    symbol: str,
    stock_data: Dict[str, Any]
) -> str:
    """
    Generate AI-powered analysis for a specific stock
    """
    
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        return "Stock analysis unavailable - API key not configured"
    
    context = f"""
    Analyze this Indian stock and provide investment perspective:
    
    STOCK: {symbol}
    Company: {stock_data.get('name', 'N/A')}
    Sector: {stock_data.get('sector', 'N/A')}
    
    FUNDAMENTALS:
    - Current Price: ₹{stock_data.get('current_price', 0):.2f}
    - P/E Ratio: {stock_data.get('pe_ratio', 'N/A')}
    - ROE: {stock_data.get('roe', 'N/A')}%
    - Dividend Yield: {stock_data.get('dividend_yield', 'N/A')}%
    - Market Cap: ₹{stock_data.get('market_cap', 0)/10000000:.2f} Cr
    
    TECHNICAL:
    - 52W High: ₹{stock_data.get('week_52_high', 'N/A')}
    - 52W Low: ₹{stock_data.get('week_52_low', 'N/A')}
    - Change: {stock_data.get('change_percent', 0):.2f}%
    
    Provide a brief 3-4 sentence analysis covering:
    1. Valuation perspective
    2. Key strength/weakness
    3. Investment stance (Bullish/Neutral/Bearish)
    """
    
    try:
        client = AsyncOpenAI(api_key=api_key)
        
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are a concise stock analyst providing brief, actionable insights on Indian stocks."
                },
                {
                    "role": "user",
                    "content": context
                }
            ],
            temperature=0.7,
            max_tokens=300
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"Error generating stock analysis: {e}")
        return "Analysis unavailable at this time."


# Helper formatting functions

def format_sector_allocation(allocation: Dict[str, float]) -> str:
    """Format sector allocation for AI context"""
    if not allocation:
        return "No sector data available"
    
    lines = []
    for sector, percent in sorted(allocation.items(), key=lambda x: x[1], reverse=True):
        lines.append(f"  - {sector}: {percent:.1f}%")
    return "\n".join(lines)


def format_performers(performers: List[Dict]) -> str:
    """Format top/bottom performers for AI context"""
    if not performers:
        return "No data available"
    
    lines = []
    for p in performers[:3]:
        lines.append(f"  - {p.get('symbol', 'N/A')}: {p.get('gain_percent', 0):.2f}%")
    return "\n".join(lines)


def format_risk_concentration(holdings: List[Dict]) -> str:
    """Format risk concentration info"""
    if not holdings:
        return "No holdings"
    
    total_value = sum(h.get('current_value', 0) for h in holdings)
    if total_value == 0:
        return "Unable to calculate"
    
    sorted_holdings = sorted(holdings, key=lambda x: x.get('current_value', 0), reverse=True)
    top3_percent = sum(h.get('current_value', 0) for h in sorted_holdings[:3]) / total_value * 100
    
    lines = [f"  - Top 3 holdings: {top3_percent:.1f}% of portfolio"]
    for h in sorted_holdings[:3]:
        percent = h.get('current_value', 0) / total_value * 100
        lines.append(f"    • {h.get('symbol', 'N/A')}: {percent:.1f}%")
    
    return "\n".join(lines)


def format_holdings_for_prediction(holdings: List[Dict]) -> str:
    """Format holdings for predictive analysis"""
    if not holdings:
        return "No holdings"
    
    lines = []
    for h in holdings[:10]:
        lines.append(f"  - {h.get('symbol', 'N/A')} ({h.get('sector', 'N/A')}): {h.get('quantity', 0)} shares")
    
    return "\n".join(lines)
