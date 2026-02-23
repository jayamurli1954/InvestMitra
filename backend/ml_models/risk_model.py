import numpy as np
import pandas as pd

def calculate_risk_score(df: pd.DataFrame, market_returns: pd.Series = None) -> float:
    """
    Calculate a synthetic risk score (1-10) for a given asset based on historical daily prices.
    df must contain a 'close' column with historical daily closing prices.
    market_returns is an optional pandas series of market returns for beta calculation.
    """
    if df is None or df.empty or 'close' not in df.columns or len(df) < 20:
        return 5.0  # default/neutral risk score

    # Daily returns
    returns = df["close"].pct_change()
    
    # Annualized Volatility
    volatility = returns.rolling(20).std().iloc[-1] * np.sqrt(252)
    if pd.isna(volatility):
        volatility = returns.std() * np.sqrt(252)
        
    # Max Drawdown
    cumulative_returns = df["close"] / df["close"].cummax() - 1
    max_drawdown = cumulative_returns.min()
    
    # Beta (default to 1.0 if market returns not available or not aligned)
    beta = 1.0
    if market_returns is not None and not market_returns.empty:
        # Align series to overlap indices
        aligned_returns, aligned_market = returns.dropna().align(market_returns.dropna(), join='inner')
        if len(aligned_returns) > 10 and np.var(aligned_market) != 0:
            cov_matrix = np.cov(aligned_returns, aligned_market)
            if cov_matrix.shape == (2, 2):
                beta = cov_matrix[0][1] / np.var(aligned_market)

    # Risk Score Formula (based on spec weighting)
    # Raw values usually fall between 0.5 and 2.5.
    risk_score_raw = (
        (volatility * 4) +
        (abs(max_drawdown) * 3) +
        (abs(beta - 1) * 2)
    )
    
    # Normalize to 1-10 scale (multiply by 3.5 instead of 10 so we don't hit the 10 cap instantly)
    normalized_score = min(max(risk_score_raw * 3.5, 1.0), 10.0)
    
    return round(normalized_score, 2)
