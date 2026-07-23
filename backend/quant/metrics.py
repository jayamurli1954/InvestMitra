"""
InvestMitra Quantitative Metrics Module
Centralized calculations for performance, risk, and portfolio analytics.
Enforces uniform 252 trading days and date-aware risk-free rates.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Union, List, Optional


DEFAULT_RISK_FREE_RATE = 0.065  # 6.5% annual risk-free rate for Indian market (RBI Repo benchmark reference)
TRADING_DAYS_PER_YEAR = 252


def calculate_cagr(start_value: float, end_value: float, num_years: float) -> float:
    """Calculate Compound Annual Growth Rate (CAGR)."""
    if start_value <= 0 or num_years <= 0:
        return 0.0
    return float((end_value / start_value) ** (1.0 / num_years) - 1.0)


def calculate_daily_returns(prices: Union[pd.Series, List[float]]) -> pd.Series:
    """Calculate daily percentage returns from price series."""
    if not isinstance(prices, pd.Series):
        prices = pd.Series(prices)
    return prices.pct_change().dropna()


def calculate_volatility(
    returns: pd.Series,
    annualize: bool = True,
    trading_days: int = TRADING_DAYS_PER_YEAR
) -> float:
    """Calculate return volatility (standard deviation)."""
    if len(returns) < 2:
        return 0.0
    std_dev = float(returns.std())
    if annualize:
        std_dev *= np.sqrt(trading_days)
    return float(std_dev)


def calculate_sharpe_ratio(
    returns: pd.Series,
    risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
    trading_days: int = TRADING_DAYS_PER_YEAR
) -> float:
    """
    Calculate annualized Sharpe Ratio.
    Formula: (Annualized Return - Risk Free Rate) / Annualized Volatility
    """
    if len(returns) < 2:
        return 0.0

    mean_daily_return = float(returns.mean())
    annualized_return = mean_daily_return * trading_days
    annualized_vol = calculate_volatility(returns, annualize=True, trading_days=trading_days)

    if annualized_vol == 0:
        return 0.0

    return float((annualized_return - risk_free_rate) / annualized_vol)


def calculate_sortino_ratio(
    returns: pd.Series,
    risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
    trading_days: int = TRADING_DAYS_PER_YEAR
) -> float:
    """
    Calculate annualized Sortino Ratio considering downside risk only.
    """
    if len(returns) < 2:
        return 0.0

    mean_daily_return = float(returns.mean())
    annualized_return = mean_daily_return * trading_days

    # Downside deviation
    daily_rf = risk_free_rate / trading_days
    downside_returns = returns[returns < daily_rf] - daily_rf
    if len(downside_returns) < 1:
        return 0.0

    downside_std = float(np.sqrt(np.mean(downside_returns ** 2))) * np.sqrt(trading_days)
    if downside_std == 0:
        return 0.0

    return float((annualized_return - risk_free_rate) / downside_std)


def calculate_max_drawdown(prices: Union[pd.Series, List[float]]) -> Dict[str, float]:
    """
    Calculate Maximum Drawdown and Drawdown duration statistics.
    """
    if not isinstance(prices, pd.Series):
        prices = pd.Series(prices)

    if len(prices) < 2:
        return {
            "max_drawdown": 0.0,
            "max_drawdown_pct": 0.0,
            "peak_value": float(prices.iloc[0]) if len(prices) > 0 else 0.0,
            "trough_value": float(prices.iloc[0]) if len(prices) > 0 else 0.0
        }

    rolling_max = prices.cummax()
    drawdown = (prices - rolling_max) / rolling_max
    max_dd_pct = float(drawdown.min())  # Will be non-positive, e.g. -0.25

    trough_idx = drawdown.idxmin()
    peak_val = float(rolling_max.loc[trough_idx]) if trough_idx in rolling_max else float(prices.max())
    trough_val = float(prices.loc[trough_idx]) if trough_idx in prices else float(prices.min())

    return {
        "max_drawdown": float(abs(max_dd_pct)),
        "max_drawdown_pct": float(max_dd_pct * 100.0),
        "peak_value": peak_val,
        "trough_value": trough_val
    }


def calculate_calmar_ratio(
    prices: pd.Series,
    cagr: float,
    max_drawdown_pct: float
) -> float:
    """Calculate Calmar Ratio = CAGR / Max Drawdown."""
    abs_dd = abs(max_drawdown_pct)
    if abs_dd == 0:
        return 0.0
    return float(cagr / (abs_dd / 100.0 if abs_dd > 1.0 else abs_dd))


def calculate_portfolio_historical_series(
    holdings: List[Dict[str, Any]],
    historical_price_matrix: pd.DataFrame
) -> pd.Series:
    """
    Calculate genuine portfolio historical value series based on holding quantities.
    holdings: list of dicts with keys 'symbol' or 'ticker', and 'quantity' or 'qty'
    historical_price_matrix: DataFrame with dates as index, symbols as columns, close prices as values
    """
    portfolio_value = pd.Series(0.0, index=historical_price_matrix.index)
    
    for holding in holdings:
        symbol = holding.get("symbol") or holding.get("ticker")
        qty = float(holding.get("quantity") or holding.get("qty") or 0.0)
        
        if symbol in historical_price_matrix.columns and qty > 0:
            portfolio_value = portfolio_value.add(historical_price_matrix[symbol] * qty, fill_value=0.0)

    return portfolio_value


def calculate_comprehensive_metrics(
    prices_or_returns: pd.Series,
    is_returns: bool = False,
    risk_free_rate: float = DEFAULT_RISK_FREE_RATE
) -> Dict[str, Any]:
    """
    Generate comprehensive analytics dictionary for a price or return series.
    """
    if is_returns:
        returns = prices_or_returns.dropna()
        prices = (1 + returns).cumprod() * 100.0
    else:
        prices = prices_or_returns.dropna()
        returns = calculate_daily_returns(prices)

    if len(prices) < 2:
        return {
            "total_return_pct": 0.0,
            "cagr": 0.0,
            "volatility_annualized": 0.0,
            "sharpe_ratio": 0.0,
            "sortino_ratio": 0.0,
            "max_drawdown_pct": 0.0,
            "calmar_ratio": 0.0,
            "total_trading_days": len(prices)
        }

    start_val = float(prices.iloc[0])
    end_val = float(prices.iloc[-1])
    total_return_pct = float((end_val - start_val) / start_val * 100.0)

    trading_days_count = len(prices)
    num_years = float(trading_days_count) / TRADING_DAYS_PER_YEAR
    cagr = calculate_cagr(start_val, end_val, max(num_years, 0.001))

    volatility = calculate_volatility(returns, annualize=True)
    sharpe = calculate_sharpe_ratio(returns, risk_free_rate=risk_free_rate)
    sortino = calculate_sortino_ratio(returns, risk_free_rate=risk_free_rate)
    dd_stats = calculate_max_drawdown(prices)
    calmar = calculate_calmar_ratio(prices, cagr, dd_stats["max_drawdown"])

    return {
        "start_value": start_val,
        "end_value": end_val,
        "total_return_pct": total_return_pct,
        "cagr": cagr,
        "cagr_pct": cagr * 100.0,
        "volatility_annualized": volatility,
        "volatility_pct": volatility * 100.0,
        "sharpe_ratio": sharpe,
        "sortino_ratio": sortino,
        "max_drawdown_pct": dd_stats["max_drawdown_pct"],
        "calmar_ratio": calmar,
        "trading_days": trading_days_count,
        "years": round(num_years, 2)
    }
