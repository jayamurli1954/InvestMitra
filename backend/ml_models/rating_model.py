def calculate_ai_rating(momentum: float, volatility: float, drawdown: float, trend: float, relative_strength: float) -> float:
    """
    Calculate the proprietary InvestMitra AI Rating (1-10 scale).
    
    Parameters:
    - momentum (0-10): recent historical price momentum
    - volatility (0-10): annualized volatility (lower is better for rating)
    - drawdown (0-10): max historical drawdown impact
    - trend (0-10): moving average crossover signal mapping
    - relative_strength (0-10): relative strength comparable to an index
    
    Returns:
    - float: score bounded between 1.0 and 10.0
    """
    
    # Weights for each criteria based on spec
    rating = (
        0.25 * momentum +
        0.20 * (10 - volatility) +
        0.15 * (10 - drawdown) +
        0.20 * trend +
        0.20 * relative_strength
    )
    
    # Cap the response strictly between 1.0 and 10.0
    return round(min(max(rating, 1.0), 10.0), 2)
