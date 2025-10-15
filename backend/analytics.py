"""
Portfolio Analytics and Recommendations Engine
"""
import math
from typing import Dict, List, Tuple
from datetime import datetime, timezone, timedelta

def calculate_portfolio_analytics(holdings: List[Dict], stock_data: Dict[str, Dict]) -> Dict:
    """Calculate comprehensive portfolio analytics"""
    
    if not holdings:
        return {
            "total_value": 0,
            "sector_allocation": {},
            "diversification_score": 0,
            "risk_level": "Unknown",
            "top_performers": [],
            "bottom_performers": [],
            "concentration_risk": "Low"
        }
    
    total_value = 0
    sector_values = {}
    performers = []
    
    # Calculate sector allocation and identify performers
    for holding in holdings:
        symbol = holding["symbol"]
        quantity = holding["quantity"]
        purchase_price = holding["purchase_price"]
        current_price = holding.get("current_price", purchase_price)
        
        invested = quantity * purchase_price
        current = quantity * current_price
        gain_percent = ((current - invested) / invested * 100) if invested > 0 else 0
        
        total_value += current
        
        # Get sector from stock data
        stock_info = stock_data.get(symbol, {})
        sector = stock_info.get("sector", "Other")
        
        if sector not in sector_values:
            sector_values[sector] = 0
        sector_values[sector] += current
        
        performers.append({
            "symbol": symbol,
            "name": holding.get("name", symbol),
            "gain_percent": gain_percent,
            "current_value": current
        })
    
    # Calculate sector allocation percentages
    sector_allocation = {}
    max_sector_percent = 0
    for sector, value in sector_values.items():
        percent = (value / total_value * 100) if total_value > 0 else 0
        sector_allocation[sector] = round(percent, 2)
        max_sector_percent = max(max_sector_percent, percent)
    
    # Sort performers
    performers.sort(key=lambda x: x["gain_percent"], reverse=True)
    top_performers = performers[:5]
    bottom_performers = performers[-5:]
    
    # Calculate diversification score (0-100)
    # Based on: number of holdings, sector distribution, concentration
    num_holdings = len(holdings)
    num_sectors = len(sector_allocation)
    
    holdings_score = min(num_holdings * 10, 40)  # Max 40 points for holdings
    sector_score = min(num_sectors * 10, 40)      # Max 40 points for sectors
    concentration_score = 20 if max_sector_percent < 40 else 10 if max_sector_percent < 60 else 0
    
    diversification_score = holdings_score + sector_score + concentration_score
    
    # Determine risk level
    if max_sector_percent > 60:
        concentration_risk = "High"
    elif max_sector_percent > 40:
        concentration_risk = "Medium"
    else:
        concentration_risk = "Low"
    
    # Risk level based on diversification and volatility
    if diversification_score >= 80:
        risk_level = "Low"
    elif diversification_score >= 50:
        risk_level = "Medium"
    else:
        risk_level = "High"
    
    return {
        "total_value": round(total_value, 2),
        "sector_allocation": sector_allocation,
        "diversification_score": diversification_score,
        "risk_level": risk_level,
        "top_performers": top_performers,
        "bottom_performers": bottom_performers,
        "concentration_risk": concentration_risk,
        "num_holdings": num_holdings,
        "num_sectors": num_sectors
    }

def calculate_rebalancing_suggestions(
    holdings: List[Dict], 
    target_allocation: Dict[str, float],
    stock_data: Dict[str, Dict]
) -> List[Dict]:
    """Calculate portfolio rebalancing suggestions"""
    
    if not holdings:
        return []
    
    # Calculate current allocation
    total_value = 0
    sector_values = {}
    
    for holding in holdings:
        symbol = holding["symbol"]
        quantity = holding["quantity"]
        current_price = holding.get("current_price", holding["purchase_price"])
        current_value = quantity * current_price
        total_value += current_value
        
        stock_info = stock_data.get(symbol, {})
        sector = stock_info.get("sector", "Other")
        
        if sector not in sector_values:
            sector_values[sector] = {"value": 0, "stocks": []}
        sector_values[sector]["value"] += current_value
        sector_values[sector]["stocks"].append({
            "symbol": symbol,
            "value": current_value,
            "price": current_price
        })
    
    # Calculate current percentages
    current_allocation = {}
    for sector, data in sector_values.items():
        current_allocation[sector] = (data["value"] / total_value * 100) if total_value > 0 else 0
    
    # Generate suggestions
    suggestions = []
    
    for sector, target_percent in target_allocation.items():
        current_percent = current_allocation.get(sector, 0)
        difference = target_percent - current_percent
        
        if abs(difference) > 5:  # Only suggest if difference > 5%
            amount = (difference / 100) * total_value
            action = "Buy" if difference > 0 else "Sell"
            
            suggestions.append({
                "sector": sector,
                "action": action,
                "current_percent": round(current_percent, 2),
                "target_percent": target_percent,
                "difference_percent": round(difference, 2),
                "amount": round(abs(amount), 2),
                "priority": "High" if abs(difference) > 15 else "Medium" if abs(difference) > 10 else "Low"
            })
    
    # Sort by priority and difference
    priority_order = {"High": 0, "Medium": 1, "Low": 2}
    suggestions.sort(key=lambda x: (priority_order[x["priority"]], abs(x["difference_percent"])), reverse=True)
    
    return suggestions

def generate_stock_recommendations(
    strategy_criteria: Dict,
    all_stocks: List[Dict],
    existing_holdings: List[str],
    limit: int = 10
) -> List[Dict]:
    """Generate AI-powered stock recommendations based on strategy"""
    
    recommendations = []
    
    for stock in all_stocks:
        # Skip if already in portfolio
        if stock["symbol"] in existing_holdings:
            continue
        
        # Check if stock matches strategy criteria
        score = 0
        reasons = []
        
        # P/E ratio check
        if "min_pe" in strategy_criteria and stock.get("pe_ratio"):
            if stock["pe_ratio"] >= strategy_criteria["min_pe"]:
                score += 20
                reasons.append(f"P/E {stock['pe_ratio']:.1f} above target")
        
        if "max_pe" in strategy_criteria and stock.get("pe_ratio"):
            if stock["pe_ratio"] <= strategy_criteria["max_pe"]:
                score += 20
                reasons.append(f"P/E {stock['pe_ratio']:.1f} within range")
        
        # ROE check
        if "min_roe" in strategy_criteria and stock.get("roe"):
            if stock["roe"] >= strategy_criteria["min_roe"]:
                score += 25
                reasons.append(f"ROE {stock['roe']:.1f}% meets criteria")
        
        # Sector match
        if "sector" in strategy_criteria:
            if stock.get("sector", "").lower() == strategy_criteria["sector"].lower():
                score += 15
                reasons.append(f"Matches {strategy_criteria['sector']} sector")
        
        # Dividend yield
        if "min_div_yield" in strategy_criteria and stock.get("dividend_yield"):
            if stock["dividend_yield"] >= strategy_criteria["min_div_yield"]:
                score += 10
                reasons.append(f"Dividend yield {stock['dividend_yield']:.2f}%")
        
        # === TECHNICAL INDICATORS ===
        
        # RSI checks
        if "min_rsi" in strategy_criteria and stock.get("rsi"):
            if stock["rsi"] >= strategy_criteria["min_rsi"]:
                score += 15
                reasons.append(f"RSI {stock['rsi']:.1f} above {strategy_criteria['min_rsi']}")
        
        if "max_rsi" in strategy_criteria and stock.get("rsi"):
            if stock["rsi"] <= strategy_criteria["max_rsi"]:
                score += 15
                reasons.append(f"RSI {stock['rsi']:.1f} below {strategy_criteria['max_rsi']}")
        
        # Moving Average checks
        if "min_ma_50" in strategy_criteria and stock.get("ma_50"):
            if stock["ma_50"] >= strategy_criteria["min_ma_50"]:
                score += 10
                reasons.append(f"50-Day MA meets criteria")
        
        if "min_ma_200" in strategy_criteria and stock.get("ma_200"):
            if stock["ma_200"] >= strategy_criteria["min_ma_200"]:
                score += 10
                reasons.append(f"200-Day MA meets criteria")
        
        # Price above MA checks
        if "price_above_ma_50" in strategy_criteria:
            if strategy_criteria["price_above_ma_50"] in [True, "true"]:
                if stock.get("ma_50") and stock["current_price"] > stock["ma_50"]:
                    score += 15
                    reasons.append("Price above 50-Day MA (Bullish)")
        
        if "price_above_ma_200" in strategy_criteria:
            if strategy_criteria["price_above_ma_200"] in [True, "true"]:
                if stock.get("ma_200") and stock["current_price"] > stock["ma_200"]:
                    score += 15
                    reasons.append("Price above 200-Day MA (Bullish)")
        
        # Golden/Death Cross
        if "golden_cross" in strategy_criteria:
            if strategy_criteria["golden_cross"] in [True, "true"]:
                if stock.get("ma_50") and stock.get("ma_200") and stock["ma_50"] > stock["ma_200"]:
                    score += 20
                    reasons.append("Golden Cross detected")
        
        if "death_cross" in strategy_criteria:
            if strategy_criteria["death_cross"] in [True, "true"]:
                if stock.get("ma_50") and stock.get("ma_200") and stock["ma_50"] < stock["ma_200"]:
                    score += 20
                    reasons.append("Death Cross detected")
        
        # Volume check
        if "min_volume" in strategy_criteria and stock.get("volume"):
            volume_lakhs = stock["volume"] / 100000
            if volume_lakhs >= strategy_criteria["min_volume"]:
                score += 10
                reasons.append(f"High volume {volume_lakhs:.1f}L")
        
        # 52-week high/low proximity
        if "min_52w_high_pct" in strategy_criteria and stock.get("week_52_high"):
            pct_from_high = ((stock["current_price"] - stock["week_52_high"]) / stock["week_52_high"]) * 100
            if pct_from_high >= strategy_criteria["min_52w_high_pct"]:
                score += 10
                reasons.append(f"{abs(pct_from_high):.1f}% from 52W high")
        
        if "min_52w_low_pct" in strategy_criteria and stock.get("week_52_low"):
            pct_from_low = ((stock["current_price"] - stock["week_52_low"]) / stock["week_52_low"]) * 100
            if pct_from_low >= strategy_criteria["min_52w_low_pct"]:
                score += 10
                reasons.append(f"{pct_from_low:.1f}% above 52W low")
        
        # Price momentum (positive change)
        if stock.get("change_percent", 0) > 0:
            score += 10
            reasons.append("Positive momentum")
        
        if score >= 50:  # Minimum score threshold
            recommendations.append({
                "symbol": stock["symbol"],
                "name": stock["name"],
                "sector": stock.get("sector", "Other"),
                "current_price": stock["current_price"],
                "change_percent": stock.get("change_percent", 0),
                "pe_ratio": stock.get("pe_ratio"),
                "roe": stock.get("roe"),
                "dividend_yield": stock.get("dividend_yield"),
                "score": score,
                "reasons": reasons,
                "recommendation": "Strong Buy" if score >= 80 else "Buy" if score >= 65 else "Consider"
            })
    
    # Sort by score
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    
    return recommendations[:limit]
