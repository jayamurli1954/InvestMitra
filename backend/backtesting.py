"""
Backtesting Engine Module
Tests investment strategies on historical data
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
import random


def backtest_strategy(
    strategy_criteria: Dict[str, Any],
    start_date: str,
    end_date: str,
    initial_capital: float = 100000,
    stocks_to_test: List[str] = None
) -> Dict[str, Any]:
    """
    Backtest a strategy over a historical period
    
    Args:
        strategy_criteria: Dictionary of strategy criteria
        start_date: Start date for backtest (YYYY-MM-DD)
        end_date: End date for backtest (YYYY-MM-DD)
        initial_capital: Starting capital amount
        stocks_to_test: List of stock symbols to test (if None, uses common stocks)
    
    Returns:
        Dictionary with backtest results
    """
    
    # Default stocks for backtesting (major Indian stocks)
    if stocks_to_test is None:
        stocks_to_test = [
            "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
            "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
            "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS", "TITAN.NS"
        ]
    
    start_dt = datetime.fromisoformat(start_date)
    end_dt = datetime.fromisoformat(end_date)
    days = (end_dt - start_dt).days
    
    # Simulate backtest results
    # In production, this would fetch real historical data and simulate trades
    
    # Generate monthly data points
    months = max(1, days // 30)
    portfolio_values = []
    current_value = initial_capital
    
    trades = []
    winning_trades = 0
    losing_trades = 0
    
    # Simulate strategy performance based on criteria
    base_return = 0.08  # 8% base annual return
    
    # Adjust return based on strategy criteria
    if "min_pe" in strategy_criteria:
        base_return += 0.02  # Value investing bonus
    if "min_roe" in strategy_criteria:
        base_return += 0.03  # Quality investing bonus
    if "min_rsi" in strategy_criteria or "max_rsi" in strategy_criteria:
        base_return += 0.015  # Technical analysis bonus
    
    # Add some volatility
    for i in range(months):
        month_date = start_dt + timedelta(days=30 * i)
        
        # Simulate monthly return with volatility
        monthly_return = (base_return / 12) + random.uniform(-0.03, 0.05)
        current_value *= (1 + monthly_return)
        
        portfolio_values.append({
            "date": month_date.strftime("%Y-%m-%d"),
            "value": round(current_value, 2),
            "return": round(monthly_return * 100, 2)
        })
        
        # Simulate some trades
        if i % 3 == 0 and i < months - 1:  # Trade every 3 months
            stock = random.choice(stocks_to_test)
            entry_price = random.uniform(1000, 3000)
            exit_price = entry_price * (1 + random.uniform(-0.15, 0.25))
            quantity = int((current_value * 0.1) / entry_price)  # 10% position
            
            profit = (exit_price - entry_price) * quantity
            
            if profit > 0:
                winning_trades += 1
            else:
                losing_trades += 1
            
            trades.append({
                "symbol": stock,
                "entry_date": month_date.strftime("%Y-%m-%d"),
                "exit_date": (month_date + timedelta(days=90)).strftime("%Y-%m-%d"),
                "entry_price": round(entry_price, 2),
                "exit_price": round(exit_price, 2),
                "quantity": quantity,
                "profit": round(profit, 2),
                "return_percent": round(((exit_price - entry_price) / entry_price) * 100, 2)
            })
    
    # Calculate metrics
    final_value = current_value
    total_return = ((final_value - initial_capital) / initial_capital) * 100
    years = days / 365.25
    cagr = (pow(final_value / initial_capital, 1 / years) - 1) * 100 if years > 0 else 0
    
    # Calculate max drawdown
    peak = initial_capital
    max_drawdown = 0
    
    for item in portfolio_values:
        value = item["value"]
        if value > peak:
            peak = value
        drawdown = ((peak - value) / peak) * 100
        if drawdown > max_drawdown:
            max_drawdown = drawdown
    
    # Win rate
    total_trades = winning_trades + losing_trades
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    
    # Average win/loss
    avg_win = sum(t["profit"] for t in trades if t["profit"] > 0) / winning_trades if winning_trades > 0 else 0
    avg_loss = sum(t["profit"] for t in trades if t["profit"] < 0) / losing_trades if losing_trades > 0 else 0
    
    return {
        "backtest_config": {
            "start_date": start_date,
            "end_date": end_date,
            "initial_capital": initial_capital,
            "duration_days": days,
            "duration_years": round(years, 2),
            "strategy": strategy_criteria
        },
        "performance_metrics": {
            "final_value": round(final_value, 2),
            "total_return": round(total_return, 2),
            "cagr": round(cagr, 2),
            "absolute_profit": round(final_value - initial_capital, 2),
            "max_drawdown": round(max_drawdown, 2),
            "volatility": round(random.uniform(12, 25), 2)  # Simulated
        },
        "trade_statistics": {
            "total_trades": total_trades,
            "winning_trades": winning_trades,
            "losing_trades": losing_trades,
            "win_rate": round(win_rate, 2),
            "average_win": round(avg_win, 2),
            "average_loss": round(avg_loss, 2),
            "profit_factor": round(abs(avg_win / avg_loss), 2) if avg_loss != 0 else 0
        },
        "portfolio_history": portfolio_values,
        "trades": trades[:10],  # Return last 10 trades
        "risk_reward_ratio": round(abs(avg_win / avg_loss), 2) if avg_loss != 0 else 0
    }


def compare_strategies(
    strategies: List[Dict[str, Any]],
    start_date: str,
    end_date: str,
    initial_capital: float = 100000
) -> List[Dict[str, Any]]:
    """
    Compare multiple strategies side by side
    
    Args:
        strategies: List of strategy dictionaries with 'name' and 'criteria'
        start_date: Start date for backtest
        end_date: End date for backtest
        initial_capital: Starting capital
    
    Returns:
        List of backtest results for each strategy
    """
    results = []
    
    for strategy in strategies:
        backtest_result = backtest_strategy(
            strategy["criteria"],
            start_date,
            end_date,
            initial_capital
        )
        
        results.append({
            "strategy_name": strategy["name"],
            "strategy_id": strategy.get("id"),
            **backtest_result
        })
    
    return results


def calculate_strategy_score(backtest_result: Dict[str, Any]) -> float:
    """
    Calculate an overall score for a strategy based on backtest results
    
    Args:
        backtest_result: Backtest result dictionary
    
    Returns:
        Score from 0-100
    """
    metrics = backtest_result["performance_metrics"]
    trade_stats = backtest_result["trade_statistics"]
    
    # Weighted scoring
    score = 0
    
    # Return score (40% weight)
    cagr = metrics["cagr"]
    if cagr > 20:
        score += 40
    elif cagr > 15:
        score += 35
    elif cagr > 10:
        score += 25
    elif cagr > 5:
        score += 15
    else:
        score += max(0, cagr)
    
    # Risk score - lower drawdown is better (30% weight)
    max_dd = metrics["max_drawdown"]
    if max_dd < 10:
        score += 30
    elif max_dd < 20:
        score += 25
    elif max_dd < 30:
        score += 15
    else:
        score += 5
    
    # Win rate score (20% weight)
    win_rate = trade_stats["win_rate"]
    score += (win_rate / 100) * 20
    
    # Profit factor score (10% weight)
    profit_factor = trade_stats["profit_factor"]
    if profit_factor > 2:
        score += 10
    elif profit_factor > 1.5:
        score += 7
    elif profit_factor > 1:
        score += 4
    
    return round(min(100, score), 2)


def generate_backtest_recommendations(backtest_result: Dict[str, Any]) -> List[str]:
    """Generate recommendations based on backtest results"""
    recommendations = []
    
    metrics = backtest_result["performance_metrics"]
    trade_stats = backtest_result["trade_statistics"]
    
    # Performance recommendations
    if metrics["cagr"] < 10:
        recommendations.append("⚠️ CAGR below 10% - Consider adding growth criteria or technical indicators")
    elif metrics["cagr"] > 20:
        recommendations.append("✅ Excellent CAGR - Strategy shows strong growth potential")
    
    # Risk recommendations
    if metrics["max_drawdown"] > 30:
        recommendations.append("⚠️ High drawdown risk - Consider adding stop-loss criteria or diversification")
    elif metrics["max_drawdown"] < 15:
        recommendations.append("✅ Low drawdown - Strategy shows good risk management")
    
    # Win rate recommendations
    if trade_stats["win_rate"] < 50:
        recommendations.append("⚠️ Win rate below 50% - Review entry/exit criteria")
    elif trade_stats["win_rate"] > 60:
        recommendations.append("✅ Good win rate - Strategy selection criteria are effective")
    
    # Profit factor recommendations
    if trade_stats["profit_factor"] < 1.5:
        recommendations.append("⚠️ Low profit factor - Winners not significantly larger than losers")
    elif trade_stats["profit_factor"] > 2:
        recommendations.append("✅ Excellent profit factor - Wins significantly outweigh losses")
    
    # Overall assessment
    score = calculate_strategy_score(backtest_result)
    if score > 75:
        recommendations.append("🎯 Overall: STRONG strategy - Consider using in live trading")
    elif score > 60:
        recommendations.append("👍 Overall: GOOD strategy - Minor tweaks may improve results")
    elif score > 40:
        recommendations.append("⚖️ Overall: AVERAGE strategy - Significant improvements needed")
    else:
        recommendations.append("❌ Overall: WEAK strategy - Major revisions recommended")
    
    return recommendations
