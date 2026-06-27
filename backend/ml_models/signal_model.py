def generate_signal(
    ai_rating: float,
    risk_score: float,
    trend_signal: str,
    expected_return: float,
    worst_case_5pct: float,
    portfolio_weight_pct: float = 0.0,
    rsi: float = 50.0,
    macd_signal: float = 0.0,
    volatility: float = 0.20
) -> dict:
    """
    Generate Accumulate / Hold / Reduce signal.

    Uses Phase 1 ML outputs enriched with RSI, MACD, and a dynamic
    volatility-aware REDUCE threshold (adapted from Anvesh portfolio script).

    Dynamic threshold logic:
      volatile stocks (30%+ annualised vol) get more tolerance before REDUCE fires.
      stable stocks (10% vol) trigger REDUCE on smaller drawdowns.
      Formula: reduce_threshold = clamp(-8%, -22%, -volatility * 0.65)
    """

    # --- Dynamic REDUCE threshold based on stock volatility ---
    # volatility is annualised (e.g. 0.20 = 20%). Clamp between -8% and -22%.
    dynamic_reduce_threshold = max(-0.22, min(-0.08, -volatility * 0.65))

    # --- Step 1: Raw signal ---
    # ACCUMULATE: strong rating + bullish trend + low risk + positive outlook
    # RSI < 65 ensures we are NOT buying an overbought stock
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

    # REDUCE: weak rating OR high-risk + bearish OR severe downside
    # Dynamic threshold: volatile stocks require deeper dip before REDUCE fires
    elif (
        ai_rating < 4.5 or
        (risk_score > 7.0 and trend_signal == "Bearish") or
        worst_case_5pct < dynamic_reduce_threshold or
        rsi > 75.0  # Overbought — correction risk
    ):
        raw_signal = "REDUCE"

    else:
        raw_signal = "HOLD"

    # --- Step 2: Portfolio-aware cap ---
    # Never recommend adding more if already over 25% concentrated
    if raw_signal == "ACCUMULATE" and portfolio_weight_pct > 25.0:
        raw_signal = "HOLD"

    # --- Step 3: Plain-English explanation ---
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

    if worst_case_5pct < dynamic_reduce_threshold:
        negatives.append(
            f"Worst-case {worst_case_5pct*100:.1f}% exceeds dynamic risk limit "
            f"({dynamic_reduce_threshold*100:.0f}% for this stock's volatility)"
        )

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

    raw_output = {
        "signal": raw_signal,
        "positives": positives,
        "negatives": negatives
    }

    try:
        from sebi_compliance_guard import sanitize_signal_output
        return sanitize_signal_output(raw_output)
    except Exception:
        return raw_output

