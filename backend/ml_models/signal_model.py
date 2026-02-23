def generate_signal(
    ai_rating: float,
    risk_score: float,
    trend_signal: str,
    expected_return: float,
    worst_case_5pct: float,
    portfolio_weight_pct: float = 0.0
) -> dict:
    """
    Generate Accumulate / Hold / Reduce signal
    using existing Phase 1 ML outputs.
    No new data or training required.
    """

    # --- Step 1: Determine raw signal from ML data ---

    if (
        ai_rating >= 7.0 and
        trend_signal == "Bullish" and
        risk_score < 6.0 and
        expected_return > 0
    ):
        raw_signal = "ACCUMULATE"

    elif (
        ai_rating < 4.5 or
        (risk_score > 7.0 and trend_signal == "Bearish") or
        worst_case_5pct < -0.15
    ):
        raw_signal = "REDUCE"

    else:
        raw_signal = "HOLD"

    # --- Step 2: Portfolio-aware adjustment ---
    # If already holding more than 25% in one stock,
    # do not recommend adding more

    if raw_signal == "ACCUMULATE" and portfolio_weight_pct > 25.0:
        raw_signal = "HOLD"

    # --- Step 3: Build explanation ---

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

    if portfolio_weight_pct > 25.0:
        negatives.append("Already high portfolio concentration")

    return {
        "signal": raw_signal,
        "positives": positives,
        "negatives": negatives
    }
