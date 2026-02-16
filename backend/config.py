"""
Configuration Module for Investment Framework
Handles environment variable validation with clear distinction between
required and optional variables.
"""

import os
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
env_path = ROOT_DIR / '.env'

# Load .env file with explicit path and override
loaded = load_dotenv(env_path, override=True)

logger = logging.getLogger(__name__)

# Debug: Check if .env was loaded
if loaded:
    logger.info(f"✅ Loaded .env file from: {env_path}")
else:
    logger.warning(f"⚠️  Could not load .env file from: {env_path}")
    logger.warning(f"   File exists: {env_path.exists()}")


class ConfigValidator:
    """Validates environment variables and provides helpful error messages"""

    # Required environment variables (application will not start without these)
    REQUIRED_VARS = {
        "SECRET_KEY": {
            "description": "JWT secret key for authentication",
            "setup_hint": "Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
        },
        "MONGO_URL": {
            "description": "MongoDB connection URL",
            "setup_hint": "For local: mongodb://localhost:27017 | For cloud: mongodb+srv://..."
        },
        "DB_NAME": {
            "description": "MongoDB database name",
            "setup_hint": "Example: investment_framework"
        },
        "FRONTEND_URL": {
            "description": "Frontend URL for CORS and email links",
            "setup_hint": "Example: http://localhost:3000"
        }
    }

    # Optional environment variables (features will be disabled if not configured)
    OPTIONAL_VARS = {
        "SMTP_SERVER": {
            "description": "SMTP server for sending emails",
            "setup_hint": "Example: smtp.gmail.com",
            "feature": "Email notifications (password reset, verification)"
        },
        "SMTP_PORT": {
            "description": "SMTP port number",
            "setup_hint": "Use 587 for TLS or 465 for SSL",
            "feature": "Email notifications"
        },
        "SMTP_EMAIL": {
            "description": "Email address for sending emails",
            "setup_hint": "Your email address (e.g., your-email@gmail.com)",
            "feature": "Email notifications"
        },
        "SMTP_PASSWORD": {
            "description": "SMTP password or app-specific password",
            "setup_hint": "For Gmail, create an App Password: https://support.google.com/accounts/answer/185833",
            "feature": "Email notifications"
        },
        "GEMINI_API_KEY": {
            "description": "Google Gemini API key for AI insights",
            "setup_hint": "Get free API key from: https://makersuite.google.com/app/apikey",
            "feature": "AI-powered portfolio analysis and predictions"
        }
    }

    def __init__(self):
        self.missing_required: List[str] = []
        self.missing_optional: Dict[str, Dict] = {}
        self.all_valid = True

    def validate_required(self) -> bool:
        """
        Validate required environment variables
        Returns True if all required vars are set, False otherwise
        """
        self.missing_required = []

        for var_name, var_info in self.REQUIRED_VARS.items():
            value = os.getenv(var_name)
            if not value or value.strip() == "":
                self.missing_required.append(var_name)
                self.all_valid = False

        return len(self.missing_required) == 0

    def validate_optional(self) -> Dict[str, List[str]]:
        """
        Check optional environment variables
        Returns dict of missing optional vars grouped by feature
        """
        self.missing_optional = {}

        for var_name, var_info in self.OPTIONAL_VARS.items():
            value = os.getenv(var_name)
            if not value or value.strip() == "":
                self.missing_optional[var_name] = var_info

        return self.missing_optional

    def print_required_errors(self):
        """Print errors for missing required variables"""
        if not self.missing_required:
            return

        print("\n" + "="*70)
        print("❌ ERROR: REQUIRED ENVIRONMENT VARIABLES NOT CONFIGURED")
        print("="*70)
        print("\nThe application cannot start without these variables:\n")

        for var_name in self.missing_required:
            var_info = self.REQUIRED_VARS[var_name]
            print(f"❌ {var_name}")
            print(f"   Description: {var_info['description']}")
            print(f"   Setup: {var_info['setup_hint']}")
            print()

        print("📝 TO FIX THIS:")
        print("   1. Copy backend/.env.example to backend/.env")
        print("   2. Fill in the required values above")
        print("   3. Restart the server")
        print("="*70 + "\n")

    def print_optional_warnings(self):
        """Print friendly warnings for missing optional variables"""
        if not self.missing_optional:
            logger.info("✅ All optional features are configured")
            return

        # Group by feature
        features = {}
        for var_name, var_info in self.missing_optional.items():
            feature = var_info.get('feature', 'Other')
            if feature not in features:
                features[feature] = []
            features[feature].append((var_name, var_info))

        print("\n" + "="*70)
        print("ℹ️  OPTIONAL FEATURES NOT CONFIGURED")
        print("="*70)
        print("\nSome optional features are disabled. Configure them to enable:\n")

        for feature, vars_list in features.items():
            print(f"📦 {feature}:")
            for var_name, var_info in vars_list:
                print(f"   • {var_name}: {var_info['description']}")
            print()

        print("💡 TO ENABLE THESE FEATURES:")
        print("   1. Edit backend/.env file")
        print("   2. Uncomment and fill in the optional variables you need")
        print("   3. Restart the server")
        print("\n   The application will work fine without these features.")
        print("="*70 + "\n")


class Config:
    """Application configuration with validated environment variables"""

    def __init__(self):
        self.validator = ConfigValidator()
        self._load_config()

    @staticmethod
    def _parse_cors_origins(raw_value: str, frontend_url: str) -> List[str]:
        """Parse comma-separated CORS origins and provide safe defaults."""
        if raw_value:
            origins = [item.strip() for item in raw_value.split(',') if item.strip()]
            if origins:
                return origins

        if frontend_url and frontend_url.strip():
            return [frontend_url.strip()]

        return ["http://localhost:3500"]

    def _load_config(self):
        """Load and validate all configuration"""
        # Validate required variables
        if not self.validator.validate_required():
            self.validator.print_required_errors()
            raise ValueError(
                f"Missing required environment variables: {', '.join(self.validator.missing_required)}"
            )

        # Load required configuration
        self.SECRET_KEY = os.getenv("SECRET_KEY")
        self.MONGO_URL = os.getenv("MONGO_URL")
        self.DB_NAME = os.getenv("DB_NAME")
        self.FRONTEND_URL = os.getenv("FRONTEND_URL")
        self.ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()

        # Load optional configuration
        self.SMTP_SERVER = os.getenv("SMTP_SERVER")
        self.SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
        self.SMTP_EMAIL = os.getenv("SMTP_EMAIL")
        self.SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
        self.SENDER_NAME = os.getenv("SENDER_NAME", "Investment Framework")
        self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
        self.CORS_ORIGINS = self._parse_cors_origins(
            os.getenv("CORS_ORIGINS", ""),
            self.FRONTEND_URL
        )
        if self.ENVIRONMENT in {"production", "staging"} and "*" in self.CORS_ORIGINS:
            raise ValueError("CORS_ORIGINS cannot contain '*' when ENVIRONMENT is production or staging")

        # Debug: Print what was actually loaded
        logger.debug(f"DEBUG: SMTP_SERVER = {self.SMTP_SERVER}")
        logger.debug(f"DEBUG: SMTP_EMAIL = {self.SMTP_EMAIL}")
        logger.debug(f"DEBUG: SMTP_PASSWORD = {'*' * len(self.SMTP_PASSWORD) if self.SMTP_PASSWORD else 'None'}")
        logger.debug(f"DEBUG: GEMINI_API_KEY = {self.GEMINI_API_KEY[:10] + '...' if self.GEMINI_API_KEY else 'None'}")

        # Check optional variables and print warnings
        self.validator.validate_optional()
        self.validator.print_optional_warnings()

        # Feature flags based on optional config
        self.email_enabled = all([
            self.SMTP_SERVER,
            self.SMTP_EMAIL,
            self.SMTP_PASSWORD
        ])
        self.ai_enabled = bool(self.GEMINI_API_KEY)

        # Log configuration status
        logger.info(f"✅ Configuration loaded successfully")
        logger.info(f"   Email features: {'✅ Enabled' if self.email_enabled else '❌ Disabled'}")
        logger.info(f"   AI features: {'✅ Enabled' if self.ai_enabled else '❌ Disabled'}")


# Global configuration instance
# This will be initialized when the module is imported
try:
    config = Config()
except ValueError as e:
    logger.error(f"Configuration error: {e}")
    raise


# Convenience functions for backward compatibility
def get_config() -> Config:
    """Get the global configuration instance"""
    return config


def is_email_enabled() -> bool:
    """Check if email features are enabled"""
    return config.email_enabled


def is_ai_enabled() -> bool:
    """Check if AI features are enabled"""
    return config.ai_enabled
