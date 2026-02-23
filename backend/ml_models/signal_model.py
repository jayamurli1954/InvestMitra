def generate_signal(
    ai_rating: float,
    risk_score: float,
    trend_signal: str,
    expected_return: float,
    worst_case_5pct: float,
    portfolio_weight_pct: float = 0.0,
    rsi: float = 50.0,
    macd_signal: float = 0.0
) -> dict:
    """
    Generate Accumulate / Hold / Reduce signal using Phase 1 ML outputs.
    Now enriched with RSI and MACD for higher-confidence signals.
    No separate training required — all derived from yfinance price history.
    """

    # --- Step 1: Determine raw signal from ML data ---
    # ACCUMULATE: strong rating + bullish trend + low risk + positive outlook
    # RSI < 65 ensures we are not buying an overbought stock
    # MACD > 0 confirms bullish momentum crossover
    if (
        ai_rating >= 7.0 and
        trend_signal == "Bullish" and
        risk_score < 6.0 and
        expected_return > 0 and
        rsi < 65.0 and
        macd_signal > 0
    ):
        raw_signal = "ACCUMULATE"

    # REDUCE: weak rating OR high risk + bearish OR severe downside
    elif (
        ai_rating < 4.5 or
        (risk_score > 7.0 and trend_signal == "Bearish") or
        worst_case_5pct < -0.15 or
        rsi > 75.0  # Overbought — risk of correction
    ):
        raw_signal = "REDUCE"

    else:
        raw_signal = "HOLD"

    # --- Step 2: Portfolio-aware adjustment ---
    # If already holding more than 25% in one stock, do not recommend adding more
    if raw_signal == "ACCUMULATE" and portfolio_weight_pct > 25.0:
        raw_signal = "HOLD"

    # --- Step 3: Build plain-English explanation ---
    positives = []
    negatives = []

    if ai_rating >= 7.0:
        positives.append("Strong AI rating")
    elif ai_rating < 4.5:
        negatives.append("Weak AI rating")

    if trend_signal == "Bullish":
        positives.append("Bullish momentum trend")
    else:
        negatives.append("Bearish momentum trend")

    if risk_score < 4.0:
        positives.append("Low risk score")
    elif risk_score > 7.0:
        negatives.append("High risk score")

    if expected_return > 0:
        positives.append("Positive 30-day outlook")
    else:
        negatives.append("Negative 30-day outlook")

    if worst_case_5pct < -0.15:
        negatives.append("High downside risk in worst case")

    # RSI driver
    if rsi < 40:
        positives.append(f"Oversold RSI ({rsi:.0f}) — potential rebound")
    elif rsi < 55:
        positives.append(f"Neutral RSI ({rsi:.0f}) — not overbought")
    elif rsi > 75:
        negatives.append(f"Overbought RSI ({rsi:.0f}) — correction risk")
    elif rsi > 65:
        negatives.append(f"Elevated RSI ({rsi:.0f}) — momentum stretched")

    # MACD driver
    if macd_signal > 0:
        positives.append("MACD bullish crossover confirmed")
    else:
        negatives.append("MACD bearish — no momentum confirmation")

    if portfolio_weight_pct > 25.0:
        negatives.append("Already high portfolio concentration")

    return {
        "signal": raw_signal,
        "positives": positives,
        "negatives": negatives
    }
