import os
import sys

from fastapi.testclient import TestClient

# Ensure backend modules can be imported when tests run from repository root.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Provide fallback values for CI when no local .env exists.
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "investment_framework_test")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3500")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3500")
os.environ.setdefault("ENVIRONMENT", "development")

from server import app  # noqa: E402


def test_root_endpoint_smoke():
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        payload = response.json()
        assert "message" in payload
        assert "status" in payload


def test_health_endpoint_smoke():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        payload = response.json()
        assert "status" in payload
        assert "mongodb" in payload
