"""
Per-user broker credential store.

Each user links their own broker account(s); their credentials are encrypted at
rest (Fernet) in the `broker_connections` collection and only decrypted in memory
to build a provider for a sync. Secrets never leave the backend and are never
returned to the client.

Requires BROKER_ENC_KEY in the environment (a Fernet key). Generate one with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
If the key changes, previously stored credentials can no longer be decrypted.
"""

import os
import json
from typing import Dict, List, Any, Optional

from cryptography.fernet import Fernet


# Brokers the connection UI/flow supports. "credentials" brokers log in from
# stored fields; "oauth" brokers need a web redirect flow (added later).
SUPPORTED_BROKERS: Dict[str, Dict[str, Any]] = {
    "Angel One": {
        "auth": "credentials",
        "fields": ["api_key", "client_code", "mpin", "totp_secret"],
        "holdings": True,
    },
    "Fyers": {
        "auth": "oauth",
        "fields": ["api_key", "secret_id", "redirect_uri"],
        "holdings": True,
    },
}


def _fernet() -> Fernet:
    key = os.getenv("BROKER_ENC_KEY")
    if not key:
        raise RuntimeError(
            "BROKER_ENC_KEY is not set. Generate one with "
            "`python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\"` and add it to backend/.env."
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_creds(creds: Dict[str, str]) -> str:
    """Encrypt a credentials dict to a storable token string."""
    return _fernet().encrypt(json.dumps(creds).encode()).decode()


def decrypt_creds(token: str) -> Dict[str, str]:
    """Decrypt a stored token back into a credentials dict."""
    return json.loads(_fernet().decrypt(token.encode()).decode())


def build_user_holdings_providers(connections: List[Dict[str, Any]]):
    """Build [(broker, provider)] from a user's stored connections (decrypting
    each in memory). Only connected, holdings-capable providers are returned."""
    from market.providers import AngelOneDataProvider  # Fyers added with OAuth phase

    out = []
    for conn in connections or []:
        broker = conn.get("broker")
        token = conn.get("enc_credentials")
        if not broker or not token:
            continue
        try:
            creds = decrypt_creds(token)
        except Exception:
            continue
        if broker == "Angel One":
            p = AngelOneDataProvider(creds=creds)
            if getattr(p, "_ready", False):
                out.append((broker, p))
    return out


def validate_broker_connection(broker: str, creds: Dict[str, str]) -> Optional[str]:
    """Try to connect with the given creds. Returns None on success, else an
    error message. Used by the connect endpoint to verify before storing."""
    if broker not in SUPPORTED_BROKERS:
        return f"Unsupported broker: {broker}"
    if broker == "Angel One":
        from market.providers import AngelOneDataProvider
        p = AngelOneDataProvider(creds=creds)
        return None if getattr(p, "_ready", False) else "Could not log in to Angel One with those details."
    return "This broker's connect flow is not available yet."
