"""
Unit tests for InvestMitra V1.1.0 Quantitative Metrics, Deterministic Backtester, and Governance/Compliance.
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
PROJECT_ROOT = ROOT_DIR.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pytest
import pandas as pd
import numpy as np

try:
    from backend.quant.metrics import (
        calculate_cagr,
        calculate_volatility,
        calculate_sharpe_ratio,
        calculate_sortino_ratio,
        calculate_max_drawdown,
        calculate_comprehensive_metrics
    )
    from backend.backtesting import backtest_strategy, calculate_strategy_score
    from backend.governance.compliance import enforce_sebi_compliance
except ModuleNotFoundError:
    from quant.metrics import (
        calculate_cagr,
        calculate_volatility,
        calculate_sharpe_ratio,
        calculate_sortino_ratio,
        calculate_max_drawdown,
        calculate_comprehensive_metrics
    )
    from backtesting import backtest_strategy, calculate_strategy_score
    from governance.compliance import enforce_sebi_compliance


def test_quant_metrics_calculations():
    cagr = calculate_cagr(100.0, 200.0, 2.0)
    assert round(cagr, 4) == round((2.0 ** 0.5) - 1.0, 4)

    np.random.seed(42)
    prices = pd.Series([100.0, 102.0, 101.0, 104.0, 103.0, 107.0, 106.0, 110.0])
    returns = prices.pct_change().dropna()
    
    vol = calculate_volatility(returns, annualize=True)
    assert vol > 0.0

    sharpe = calculate_sharpe_ratio(returns, risk_free_rate=0.065)
    assert isinstance(sharpe, float)

    dd_stats = calculate_max_drawdown(prices)
    assert dd_stats["max_drawdown"] >= 0.0
    assert dd_stats["max_drawdown_pct"] <= 0.0

    metrics = calculate_comprehensive_metrics(prices)
    assert metrics["trading_days"] == 8
    assert "total_return_pct" in metrics
    assert "cagr" in metrics


def test_deterministic_backtest_engine():
    res = backtest_strategy(
        strategy_criteria={"min_roe": 15},
        start_date="2024-01-01",
        end_date="2024-06-30",
        initial_capital=100000.0,
        stocks_to_test=["RELIANCE.NS", "TCS.NS", "INFY.NS"]
    )
    
    assert res["backtest_config"]["initial_capital"] == 100000.0
    assert "performance_metrics" in res
    assert "final_value" in res["performance_metrics"]
    assert "trade_statistics" in res
    assert "portfolio_history" in res
    assert len(res["portfolio_history"]) > 0

    score = calculate_strategy_score(res)
    assert 0.0 <= score <= 100.0


def test_sebi_compliance_enforcement():
    raw_text = "You should BUY RELIANCE at entry point 2500 and SELL at target price 3000 with stop loss 2400."
    sanitized = enforce_sebi_compliance(raw_text)
    
    assert "BUY" not in sanitized
    assert "SELL" not in sanitized
    assert "FAVORABLE OUTLOOK" in sanitized
    assert "RISK MITIGATION" in sanitized

    raw_signal = {
        "symbol": "TCS",
        "signal": "BUY",
        "positives": ["Strong BUY signal on EMA crossover"],
        "negatives": ["Stop loss triggered"]
    }
    compliant_output = enforce_sebi_compliance(raw_signal)
    
    assert compliant_output["signal"] != "BUY"
    assert "disclaimer" in compliant_output
    assert "InvestMitra is a financial analytics" in compliant_output["disclaimer"]
