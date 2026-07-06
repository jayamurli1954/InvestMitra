"""Centralized environment and security configuration."""

import logging
import os

logger = logging.getLogger(__name__)


def clean_env(name: str, default=None):
    value = os.getenv(name, default)
    if value is None:
        return None
    return str(value).strip().strip('"').strip("'")


def is_production() -> bool:
    return clean_env("APP_ENV", "development").lower() in ("production", "prod")


def dev_features_enabled() -> bool:
    return clean_env("ENABLE_DEV_FEATURES", "false").lower() in ("1", "true", "yes", "on")


def debug_endpoints_enabled() -> bool:
    return clean_env("ENABLE_DEBUG_ENDPOINTS", "false").lower() in ("1", "true", "yes", "on")


def get_secret_key() -> str:
    key = clean_env("SECRET_KEY")
    if key:
        return key
    if is_production():
        raise RuntimeError("SECRET_KEY environment variable is required in production")
    logger.warning("SECRET_KEY not set; using ephemeral dev-only key")
    return "dev-only-ephemeral-key-not-for-production"


def cookie_secure() -> bool:
    explicit = clean_env("COOKIE_SECURE")
    if explicit is not None:
        return explicit.lower() in ("1", "true", "yes", "on")
    return is_production()


def validate_production_config() -> None:
    if not is_production():
        return
    missing = []
    if not clean_env("SECRET_KEY"):
        missing.append("SECRET_KEY")
    if not clean_env("BREVO_API_KEY"):
        missing.append("BREVO_API_KEY")
    if missing:
        raise RuntimeError(f"Missing required production environment variables: {', '.join(missing)}")
