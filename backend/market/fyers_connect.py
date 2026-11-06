"""
One-time Fyers (API v3) OAuth connect helper — READ-ONLY market data.

Run this locally once (and again whenever the access token expires — Fyers tokens
expire daily at 6:30 AM IST, so re-run after that each trading day; API error
codes -8/-15/-16/-17 also mean the token is invalid/expired):

    cd backend
    python -m market.fyers_connect

It prints the Fyers login URL, you log in in your browser, copy the `auth_code`
from the redirected URL, and paste it here. The script exchanges it for an access
token and writes it to backend/.env. Your auth code and token never leave your
machine.

Required in backend/.env before running:
    FYERS_APP_ID       - your app id, e.g. ABCD1234-100
    FYERS_SECRET_ID    - the app secret
    FYERS_REDIRECT_URI - the redirect URL registered for the app

Use a NON-TRADING Fyers app for InvestMitra: read-only data needs nothing more,
and it cannot place orders.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"


def _upsert_env(path: Path, updates: dict) -> None:
    lines = path.read_text().splitlines() if path.exists() else []
    keys = set(updates)
    out, seen = [], set()
    for line in lines:
        key = line.split("=", 1)[0].strip() if "=" in line else None
        if key in keys:
            out.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            out.append(line)
    for key in keys - seen:
        out.append(f"{key}={updates[key]}")
    path.write_text("\n".join(out) + "\n")


def main() -> int:
    load_dotenv(ENV_PATH)
    try:
        from fyers_apiv3 import fyersModel
    except Exception as e:
        print(f"fyers-apiv3 not installed: {e}")
        return 1

    app_id = os.getenv("FYERS_APP_ID")
    secret = os.getenv("FYERS_SECRET_ID")
    redirect = os.getenv("FYERS_REDIRECT_URI")
    missing = [k for k, v in {
        "FYERS_APP_ID": app_id, "FYERS_SECRET_ID": secret, "FYERS_REDIRECT_URI": redirect,
    }.items() if not v]
    if missing:
        print(f"Missing in {ENV_PATH}: {', '.join(missing)}")
        return 1

    session = fyersModel.SessionModel(
        client_id=app_id,
        secret_key=secret,
        redirect_uri=redirect,
        response_type="code",
        grant_type="authorization_code",
    )

    print("\n1) Open this URL in your browser and log in to Fyers:\n")
    print("   " + session.generate_authcode())
    print("\n2) After login you'll be redirected to your registered URL.")
    print("   Copy the value of the `auth_code` parameter from that redirected URL.\n")
    auth_code = input("Paste the auth_code here: ").strip()
    if not auth_code:
        print("No auth_code entered. Aborting.")
        return 1

    session.set_token(auth_code)
    resp = session.generate_token()
    access_token = (resp or {}).get("access_token")
    if not access_token:
        print(f"Token exchange FAILED: {resp}")
        return 1

    _upsert_env(ENV_PATH, {"FYERS_ACCESS_TOKEN": access_token})
    print(f"\n✅ Fyers connected. Token saved to {ENV_PATH}.")
    print("   Set PRIMARY_PROVIDER=fyers to use it for market data.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
