"""
End-to-End Integration Test Suite for InvestMitra V1.1.0 Architecture.
Tests APIRouters: /api/quant, /api/research, /api/events, DSPy, and LangGraph workflow.
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
from fastapi.testclient import TestClient

try:
    from backend.server import app
except ModuleNotFoundError:
    from server import app

client = TestClient(app)


def test_quant_api_routes():
    res = client.post("/api/quant/backtest", json={
        "start_date": "2024-01-01",
        "end_date": "2024-06-30",
        "initial_capital": 100000.0,
        "strategy_criteria": {"min_roe": 15}
    })
    assert res.status_code == 200
    data = res.json()
    assert "performance_metrics" in data
    assert "cagr" in data["performance_metrics"]
    assert "recommendations" in data

    res_prompt = client.post("/api/quant/backtest/parse-prompt", json={
        "prompt": "Test strategy with 20 EMA and 50 EMA crossover"
    })
    assert res_prompt.status_code == 200
    parsed = res_prompt.json()
    assert parsed["parsed"] is True
    assert "ema" in parsed["strategy_id"].lower()


def test_research_api_routes():
    res = client.get("/api/research/committee/INFY")
    assert res.status_code == 200
    data = res.json()
    assert data["symbol"] == "INFY"
    assert "disclaimer" in data
    assert "BUY" not in data.get("outlook", "")

    res_mandate = client.post("/api/research/portfolio-risk-mandates", json={
        "holdings": [
            {"symbol": "RELIANCE", "quantity": 10, "current_price": 2500.0},
            {"symbol": "TCS", "quantity": 2, "current_price": 3500.0}
        ]
    })
    assert res_mandate.status_code == 200
    mandate_data = res_mandate.json()
    assert "hhi_index" in mandate_data
    assert "disclaimer" in mandate_data


def test_events_and_multiagent_api_routes():
    res_feed = client.get("/api/events/feed")
    assert res_feed.status_code == 200
    feed = res_feed.json()
    assert len(feed) > 0

    evt_id = feed[0]["event_id"]

    res_scope = client.get(f"/api/events/{evt_id}/scope")
    assert res_scope.status_code == 200
    scope = res_scope.json()
    assert "negative_sectors" in scope

    res_impact = client.post("/api/events/analyze-company-impact", json={
        "event_id": evt_id,
        "company_symbol": "INDIGO"
    })
    assert res_impact.status_code == 200
    impact = res_impact.json()
    assert impact["target_company"]["symbol"] == "INDIGO"
    assert len(impact["evidence_citations"]) > 0

    res_agent = client.post("/api/events/multi-agent-research", json={
        "event_id": evt_id,
        "company_symbol": "INDIGO"
    })
    assert res_agent.status_code == 200
    agent_report = res_agent.json()
    assert "InvestMitra Research Report" in agent_report["title"]
    assert "disclaimer" in agent_report
