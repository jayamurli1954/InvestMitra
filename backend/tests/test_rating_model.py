import pytest
from ml_models.rating_model import calculate_ai_rating

def test_calculate_ai_rating_perfect_stock():
    # A stock with perfect momentum, zero volatility, zero drawdown, perfect trend, perfect relative strength
    score = calculate_ai_rating(
        momentum=10.0,
        volatility=0.0,
        drawdown=0.0,
        trend=10.0,
        relative_strength=10.0
    )
    assert score == 10.0

def test_calculate_ai_rating_worst_stock():
    # A stock with no momentum, massive volatility, massive drawdown, bad trend, bad relative strength
    score = calculate_ai_rating(
        momentum=0.0,
        volatility=10.0,
        drawdown=10.0,
        trend=0.0,
        relative_strength=0.0
    )
    # The math would be 0 + 0 + 0 + 0 + 0 = 0.0
    # But the function bounds it to a minimum of 1.0
    assert score == 1.0

def test_calculate_ai_rating_average_stock():
    # A regular stock around the median
    score = calculate_ai_rating(
        momentum=5.0,
        volatility=5.0,
        drawdown=5.0,
        trend=5.0,
        relative_strength=5.0
    )
    # 0.25(5) + 0.20(5) + 0.15(5) + 0.20(5) + 0.20(5) = 1.25 + 1.0 + 0.75 + 1.0 + 1.0 = 5.0
    assert score == 5.0
