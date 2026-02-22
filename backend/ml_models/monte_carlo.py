import numpy as np
import pandas as pd

def monte_carlo_simulation(returns: pd.Series, simulations: int = 1000, days: int = 30) -> dict:
    """
    Run a Monte Carlo simulation on historical daily returns to forecast future performance probabilities.
    """
    if returns.empty or len(returns) < 20:
        return {
            "expected_return": 0.0,
            "volatility": 0.0,
            "worst_case_5pct": 0.0,
            "best_case_95pct": 0.0
        }
        
    mean = returns.mean()
    std = returns.std()
    
    # Generate structured random noise based on historical stats
    # np.random.normal(loc=mean, scale=std, size=(simulations, days)) is much faster than a loop
    simulated_returns = np.random.normal(mean, std, (simulations, days))
    
    # Calculate cumulative returns over the period for each simulation run
    simulated_cumulative_returns = np.prod(1 + simulated_returns, axis=1) - 1
    
    expected_return = np.mean(simulated_cumulative_returns)
    volatility = np.std(simulated_cumulative_returns)
    worst_case = np.percentile(simulated_cumulative_returns, 5)
    best_case = np.percentile(simulated_cumulative_returns, 95)
    
    return {
        "expected_return": float(round(expected_return, 4)),
        "volatility": float(round(volatility, 4)),
        "worst_case_5pct": float(round(worst_case, 4)),
        "best_case_95pct": float(round(best_case, 4))
    }
