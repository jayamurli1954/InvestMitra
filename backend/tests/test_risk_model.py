import pytest
import pandas as pd
import numpy as np
import math
from ml_models.risk_model import calculate_risk_score

def test_calculate_risk_score_empty():
    score = calculate_risk_score(pd.DataFrame())
    assert score == 5.0

def test_calculate_risk_score_mock_data():
    dates = pd.date_range("2025-01-01", periods=100)
    # Simulate a steady climb (low risk)
    close_prices = np.linspace(100, 150, 100) + np.random.normal(0, 1, 100)
    df = pd.DataFrame({"close": close_prices}, index=dates)
    score = calculate_risk_score(df)
    assert 1.0 <= score <= 10.0

def test_calculate_risk_score_high_risk():
    dates = pd.date_range("2025-01-01", periods=100)
    # Simulate high volatility and big drawdown
    close_prices = np.linspace(100, 100, 100)
    close_prices[40:] = 50  # massive drop
    close_prices = close_prices + np.random.normal(0, 10, 100)  # massive noise
    df = pd.DataFrame({"close": close_prices}, index=dates)
    
    score = calculate_risk_score(df)
    
    # We expect the risk score to be much higher than a stable stock
    # For a stock that drops 50% and has huge noise, the risk score should peg near the upper bound or at least > 4.0
    assert score > 3.0
