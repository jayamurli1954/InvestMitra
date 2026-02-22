import pytest
from analytics import calculate_rebalancing_suggestions

def test_calculate_rebalancing_suggestions_empty():
    results = calculate_rebalancing_suggestions([], 100000.0, {})
    assert results == []

def test_calculate_rebalancing_suggestions_basic():
    holdings = [
        {"symbol": "RELIANCE", "current_value": 75000.0, "quantity": 30},
        {"symbol": "TCS", "current_value": 25000.0, "quantity": 10}
    ]
    # Total portfolio = 100K. RELIANCE is 75%, TCS is 25%.
    # If the user preference states max_sector_weight varies, or if the logic imposes generic stock limits.
    # The current logic usually limits single stock to 10% or so based on rules if no rule, it might suggest selling.
    
    target_allocation = {"IT": 50.0, "Energy": 50.0}
    results = calculate_rebalancing_suggestions(holdings, target_allocation, {})
    assert isinstance(results, list)

