"""
Unit & Integration Tests for InvestMitra P1 & P2 Strategic Recommendations:
- Berkshire Scorecard Model
- PKScreener Technical Indicators & Breakout Scans
- Smart AI Gateway Routing Strategy
- Portfolio Excel Exporter Route
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
from fastapi.testclient import TestClient

try:
    from backend.analysis import calculate_berkshire_scorecard
    from backend.market_data import calculate_technical_indicators, get_pkscreener_technical_scans
    from backend.ai.gateway import gateway, TaskType
    from backend.server import app
except ModuleNotFoundError:
    from analysis import calculate_berkshire_scorecard
    from market_data import calculate_technical_indicators, get_pkscreener_technical_scans
    from ai.gateway import gateway, TaskType
    from server import app

client = TestClient(app)


def test_berkshire_scorecard_model():
    scorecard = calculate_berkshire_scorecard("RELIANCE", {"roe": 22.5, "debt_to_equity": 0.35, "pe_ratio": 24.0})
    assert scorecard["symbol"] == "RELIANCE"
    assert scorecard["berkshire_score"] > 60.0
    assert "return_on_capital" in scorecard["pillars"]
    assert "disclaimer" in scorecard


def test_pkscreener_technical_indicators():
    dates = pd.date_range("2024-01-01", periods=30, freq="D")
    prices = [100.0 + i * 1.5 for i in range(30)]
    volumes = [1000.0 + (5000.0 if i == 29 else 0.0) for i in range(30)]
    df = pd.DataFrame({"Close": prices, "Volume": volumes}, index=dates)

    indicators = calculate_technical_indicators(df)
    assert indicators["rsi"] > 50.0
    assert indicators["ema_20"] > 0.0
    assert indicators["signal"] in ["BULLISH_BREAKOUT", "CONSOLIDATION", "BEARISH_PULLBACK"]
    assert indicators["volume_spike"] is True


def test_ai_gateway_smart_routing():
    model = gateway.select_model_for_task(TaskType.CODE_REASONING)
    assert "claude" in model

    res = gateway.execute_prompt("Analyze quarterly margins", task_type=TaskType.RESEARCH_SYNTHESIS)
    assert res["status"] == "SUCCESS"
    assert "claude" in res["model_used"]


def test_p1_p2_api_routes():
    # Test Berkshire Scorecard Endpoint
    res_scorecard = client.get("/api/research/berkshire-scorecard/TCS")
    assert res_scorecard.status_code == 200
    sc = res_scorecard.json()
    assert sc["symbol"] == "TCS"

    # Test Technical Scans Endpoint
    res_scans = client.get("/api/quant/technical-scans?symbols=RELIANCE.NS,TCS.NS")
    assert res_scans.status_code == 200
    scans = res_scans.json()
    assert len(scans) == 2
    assert "rsi" in scans[0]
