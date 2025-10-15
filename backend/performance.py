"""
Advanced Performance Analytics Module
Calculates CAGR, Sharpe Ratio, Time-Weighted Returns, and other performance metrics
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
import math


def calculate_cagr(beginning_value: float, ending_value: float, years: float) -> float:
    """Calculate Compound Annual Growth Rate"""
    if beginning_value <= 0 or years <= 0:
        return 0.0
    return (pow(ending_value / beginning_value, 1 / years) - 1) * 100


def calculate_annualized_return(transactions: List[Dict], current_value: float) -> Dict[str, Any]:
    """Calculate annualized returns based on transaction history"""
    if not transactions:
        return {"cagr": 0, "years": 0, "total_return": 0}
    
    # Get earliest transaction date
    earliest_date = min(datetime.fromisoformat(t["transaction_date"]) for t in transactions)
    today = datetime.now()
    years = (today - earliest_date).days / 365.25
    
    if years < 0.01:  # Less than 4 days
        return {"cagr": 0, "years": 0, "total_return": 0}
    
    # Calculate total invested
    total_invested = sum(
        t["total_amount"] for t in transactions if t["transaction_type"] == "buy"
    )
    
    total_return = ((current_value - total_invested) / total_invested * 100) if total_invested > 0 else 0
    cagr = calculate_cagr(total_invested, current_value, years) if total_invested > 0 else 0
    
    return {
        "cagr": round(cagr, 2),
        "years": round(years, 2),
        "total_return": round(total_return, 2),
        "total_invested": total_invested,
        "current_value": current_value
    }


def calculate_sharpe_ratio(returns: List[float], risk_free_rate: float = 6.5) -> float:
    """
    Calculate Sharpe Ratio
    risk_free_rate: Annual risk-free rate in percentage (default 6.5% for India)
    """
    if not returns or len(returns) < 2:
        return 0.0
    
    # Calculate average return
    avg_return = sum(returns) / len(returns)
    
    # Calculate standard deviation
    variance = sum((r - avg_return) ** 2 for r in returns) / (len(returns) - 1)
    std_dev = math.sqrt(variance)
    
    if std_dev == 0:
        return 0.0
    
    # Annualize if needed (assuming monthly returns)
    annualized_return = avg_return * 12
    annualized_std = std_dev * math.sqrt(12)
    
    sharpe = (annualized_return - risk_free_rate) / annualized_std
    return round(sharpe, 2)


def calculate_volatility(returns: List[float]) -> float:
    """Calculate portfolio volatility (standard deviation of returns)"""
    if not returns or len(returns) < 2:
        return 0.0
    
    avg_return = sum(returns) / len(returns)
    variance = sum((r - avg_return) ** 2 for r in returns) / (len(returns) - 1)
    std_dev = math.sqrt(variance)
    
    # Annualize (assuming monthly returns)
    annualized_volatility = std_dev * math.sqrt(12)
    return round(annualized_volatility, 2)


def calculate_max_drawdown(portfolio_values: List[Dict]) -> Dict[str, Any]:
    """Calculate maximum drawdown from portfolio value history"""
    if not portfolio_values or len(portfolio_values) < 2:
        return {"max_drawdown": 0, "peak_value": 0, "trough_value": 0}
    
    peak = portfolio_values[0]["value"]
    max_dd = 0
    peak_value = peak
    trough_value = peak
    
    for item in portfolio_values:
        value = item["value"]
        if value > peak:
            peak = value
        
        drawdown = (peak - value) / peak * 100
        if drawdown > max_dd:
            max_dd = drawdown
            peak_value = peak
            trough_value = value
    
    return {
        "max_drawdown": round(max_dd, 2),
        "peak_value": round(peak_value, 2),
        "trough_value": round(trough_value, 2)
    }


def calculate_sector_performance(holdings: List[Dict], transactions: List[Dict]) -> List[Dict]:
    """Calculate performance by sector"""
    sector_data = {}
    
    for holding in holdings:
        sector = holding.get("sector", "Other")
        
        # Calculate invested amount from transactions
        buy_txns = [t for t in transactions 
                   if t["symbol"] == holding["symbol"] and t["transaction_type"] == "buy"]
        
        invested = sum(t["total_amount"] for t in buy_txns)
        current_value = holding["quantity"] * holding.get("current_price", 0)
        gain = current_value - invested
        
        if sector not in sector_data:
            sector_data[sector] = {
                "sector": sector,
                "invested": 0,
                "current_value": 0,
                "gain": 0,
                "stocks": 0
            }
        
        sector_data[sector]["invested"] += invested
        sector_data[sector]["current_value"] += current_value
        sector_data[sector]["gain"] += gain
        sector_data[sector]["stocks"] += 1
    
    # Calculate percentages
    result = []
    for sector, data in sector_data.items():
        gain_percent = (data["gain"] / data["invested"] * 100) if data["invested"] > 0 else 0
        result.append({
            "sector": sector,
            "invested": round(data["invested"], 2),
            "current_value": round(data["current_value"], 2),
            "gain": round(data["gain"], 2),
            "gain_percent": round(gain_percent, 2),
            "stocks": data["stocks"]
        })
    
    return sorted(result, key=lambda x: x["gain_percent"], reverse=True)


def calculate_monthly_returns(transactions: List[Dict], current_portfolio_value: float) -> List[Dict]:
    """Calculate monthly returns for time series analysis"""
    if not transactions:
        return []
    
    # Group transactions by month
    monthly_data = {}
    
    for txn in transactions:
        date = datetime.fromisoformat(txn["transaction_date"])
        month_key = date.strftime("%Y-%m")
        
        if month_key not in monthly_data:
            monthly_data[month_key] = {
                "date": month_key,
                "invested": 0,
                "value": 0
            }
        
        if txn["transaction_type"] == "buy":
            monthly_data[month_key]["invested"] += txn["total_amount"]
        elif txn["transaction_type"] == "sell":
            monthly_data[month_key]["invested"] -= txn["total_amount"]
    
    # Sort by date
    sorted_months = sorted(monthly_data.items())
    
    # Calculate cumulative values and returns
    cumulative_invested = 0
    monthly_returns = []
    
    for i, (month, data) in enumerate(sorted_months):
        cumulative_invested += data["invested"]
        
        # For the last month, use current portfolio value
        if i == len(sorted_months) - 1:
            portfolio_value = current_portfolio_value
        else:
            # Estimate based on transactions (simplified)
            portfolio_value = cumulative_invested
        
        monthly_return = ((portfolio_value - cumulative_invested) / cumulative_invested * 100) if cumulative_invested > 0 else 0
        
        monthly_returns.append({
            "month": month,
            "invested": round(cumulative_invested, 2),
            "value": round(portfolio_value, 2),
            "return": round(monthly_return, 2)
        })
    
    return monthly_returns


def compare_with_benchmark(portfolio_return: float, benchmark_return: float) -> Dict[str, Any]:
    """Compare portfolio performance with benchmark"""
    alpha = portfolio_return - benchmark_return
    outperformance = alpha > 0
    
    return {
        "portfolio_return": round(portfolio_return, 2),
        "benchmark_return": round(benchmark_return, 2),
        "alpha": round(alpha, 2),
        "outperformance": outperformance,
        "relative_performance": "Outperforming" if outperformance else "Underperforming"
    }


def calculate_win_rate(transactions: List[Dict]) -> Dict[str, Any]:
    """Calculate win rate from sell transactions"""
    sell_transactions = [t for t in transactions if t["transaction_type"] == "sell"]
    
    if not sell_transactions:
        return {"win_rate": 0, "winning_trades": 0, "losing_trades": 0, "total_trades": 0}
    
    # This is simplified - in real implementation, match with buy transactions
    winning_trades = 0
    losing_trades = 0
    
    for sell in sell_transactions:
        # Simplified: assume average profit/loss based on notes or price comparison
        # In reality, should match with specific buy lots
        pass
    
    return {
        "win_rate": 0,  # Placeholder
        "winning_trades": winning_trades,
        "losing_trades": losing_trades,
        "total_trades": len(sell_transactions)
    }


def generate_performance_summary(
    transactions: List[Dict],
    holdings: List[Dict],
    current_portfolio_value: float
) -> Dict[str, Any]:
    """Generate comprehensive performance summary"""
    
    # If no transactions, calculate from portfolio holdings
    if not transactions:
        # Calculate invested amount from holdings
        total_invested = sum(
            h["quantity"] * h.get("purchase_price", 0) 
            for h in holdings
        )
        
        # Calculate returns based on holdings
        total_return = ((current_portfolio_value - total_invested) / total_invested * 100) if total_invested > 0 else 0
        
        # Calculate time period from earliest purchase date
        if holdings:
            earliest_dates = [h.get("purchase_date") for h in holdings if h.get("purchase_date")]
            if earliest_dates:
                try:
                    # Parse dates in YYYY-MM-DD format
                    parsed_dates = []
                    for d in earliest_dates:
                        try:
                            parsed_dates.append(datetime.strptime(d, "%Y-%m-%d"))
                        except:
                            # Try ISO format as fallback
                            try:
                                parsed_dates.append(datetime.fromisoformat(d))
                            except:
                                pass
                    
                    if parsed_dates:
                        earliest_date = min(parsed_dates)
                        years = max(0.01, (datetime.now() - earliest_date).days / 365.25)
                    else:
                        years = 1.0  # Default to 1 year if parsing fails
                except Exception as e:
                    years = 1.0
            else:
                years = 1.0
        else:
            years = 1.0
        
        cagr = calculate_cagr(total_invested, current_portfolio_value, years) if total_invested > 0 else 0
        
        annualized = {
            "cagr": round(cagr, 2),
            "years": round(years, 2),
            "total_return": round(total_return, 2),
            "total_invested": total_invested,
            "current_value": current_portfolio_value
        }
        
        # Sector performance from holdings only
        sector_perf = []
        sector_data = {}
        for holding in holdings:
            sector = holding.get("sector", "Other")
            invested = holding["quantity"] * holding.get("purchase_price", 0)
            current_value = holding["quantity"] * holding.get("current_price", 0)
            
            if sector not in sector_data:
                sector_data[sector] = {
                    "sector": sector,
                    "invested": 0,
                    "current_value": 0,
                    "stocks": 0
                }
            
            sector_data[sector]["invested"] += invested
            sector_data[sector]["current_value"] += current_value
            sector_data[sector]["stocks"] += 1
        
        for sector, data in sector_data.items():
            gain = data["current_value"] - data["invested"]
            gain_percent = (gain / data["invested"] * 100) if data["invested"] > 0 else 0
            sector_perf.append({
                "sector": sector,
                "invested": round(data["invested"], 2),
                "current_value": round(data["current_value"], 2),
                "gain": round(gain, 2),
                "gain_percent": round(gain_percent, 2),
                "stocks": data["stocks"]
            })
        
        sector_perf = sorted(sector_perf, key=lambda x: x["gain_percent"], reverse=True)
        
        # No transaction data, so no monthly returns or Sharpe ratio
        sharpe = 0
        volatility = 0
        monthly_data = []
    else:
        # Original logic with transactions
        annualized = calculate_annualized_return(transactions, current_portfolio_value)
        monthly_data = calculate_monthly_returns(transactions, current_portfolio_value)
        returns_list = [m["return"] for m in monthly_data] if monthly_data else []
        sharpe = calculate_sharpe_ratio(returns_list)
        volatility = calculate_volatility(returns_list)
        sector_perf = calculate_sector_performance(holdings, transactions)
    
    # Benchmark comparison (Nifty 50 - using approximate 1-year return)
    nifty_return = 15.0  # Approximate 1-year return
    benchmark_comparison = compare_with_benchmark(annualized["total_return"], nifty_return)
    
    return {
        "annualized_returns": annualized,
        "risk_metrics": {
            "sharpe_ratio": sharpe,
            "volatility": volatility,
            "risk_free_rate": 6.5
        },
        "sector_performance": sector_perf,
        "benchmark_comparison": benchmark_comparison,
        "monthly_returns": monthly_data,
        "summary": {
            "total_invested": annualized.get("total_invested", 0),
            "current_value": current_portfolio_value,
            "absolute_gain": current_portfolio_value - annualized.get("total_invested", 0),
            "total_return_percent": annualized["total_return"],
            "cagr": annualized["cagr"],
            "time_period_years": annualized["years"]
        }
    }
