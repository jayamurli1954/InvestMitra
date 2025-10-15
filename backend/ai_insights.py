"""
AI-Powered Portfolio Insights Module
Uses LLM to generate personalized investment recommendations and portfolio optimization
"""

import os
import re
import json
from typing import List, Dict, Any
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()

def extract_json_from_markdown(text: str) -> str:
    """
    Extract JSON content from markdown code blocks
    
    Handles formats like:
    - ```json {...}```
    - ``` {...}```
    - {...} (plain JSON)
    """
    # Try to find JSON in markdown code blocks
    patterns = [
        r'```json\s*(\{.*?\})\s*```',  # ```json {...}```
        r'```\s*(\{.*?\})\s*```',      # ``` {...}```
        r'(\{.*?\})',                   # {...} (plain)
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
    Generate AI-powered portfolio optimization suggestions
    
    Args:
        portfolio_data: Current portfolio holdings with prices
        analytics_data: Portfolio analytics including sector allocation, performance
    
    Returns:
        Dictionary with optimization suggestions
    """
    
    api_key = os.getenv("EMERGENT_LLM_KEY")
    
    # Prepare context for AI
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
    """
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id="portfolio_optimization",
            system_message="You are an expert Indian stock market portfolio advisor providing actionable investment advice."
        ).with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(text=context)
        response = await chat.send_message(user_message)
        
        # Parse response
        import json
        try:
            insights = json.loads(response)
        except:
            # Fallback if not JSON
            insights = {
                "rebalancing": [response[:200]],
                "diversification": ["Review sector allocation"],
                "risk_management": ["Monitor concentration risk"],
                "tactical_moves": ["Consider market conditions"]
            }
        
        return {
            "optimization_suggestions": insights,
            "generated_at": "now"
        }
        
    except Exception as e:
        print(f"Error generating AI insights: {e}")
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
    
    Args:
        portfolio_data: Current portfolio holdings
        market_trends: Market trend data
    
    Returns:
        Dictionary with predictive insights
    """
    
    api_key = os.getenv("EMERGENT_LLM_KEY")
    
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
    Be specific to Indian market conditions and the sectors in this portfolio.
    """
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id="predictive_insights",
            system_message="You are an expert market analyst specializing in Indian equities and portfolio forecasting."
        ).with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(text=context)
        response = await chat.send_message(user_message)
        
        # Parse response
        import json
        try:
            insights = json.loads(response)
        except:
            insights = {
                "outlook_3m": response[:200],
                "risks": ["Market volatility", "Sector-specific risks"],
                "opportunities": ["Review emerging sectors"],
                "action_items": ["Monitor portfolio regularly"]
            }
        
        return {
            "predictive_insights": insights,
            "generated_at": "now"
        }
        
    except Exception as e:
        print(f"Error generating predictive insights: {e}")
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
    
    Args:
        symbol: Stock symbol
        stock_data: Stock fundamentals and technical data
    
    Returns:
        Analysis text
    """
    
    api_key = os.getenv("EMERGENT_LLM_KEY")
    
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
        chat = LlmChat(
            api_key=api_key,
            session_id=f"stock_analysis_{symbol}",
            system_message="You are a concise stock analyst providing brief, actionable insights on Indian stocks."
        ).with_model("openai", "gpt-4o-mini")
        
        user_message = UserMessage(text=context)
        response = await chat.send_message(user_message)
        
        return response
        
    except Exception as e:
        print(f"Error generating stock analysis: {e}")
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
    
    # Find top 3 holdings by value
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
    for h in holdings[:10]:  # Top 10
        lines.append(f"  - {h.get('symbol', 'N/A')} ({h.get('sector', 'N/A')}): {h.get('quantity', 0)} shares")
    
    return "\n".join(lines)
