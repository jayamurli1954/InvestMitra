"""
One-time Shoonya (Finvasia) OAuth connect helper.

Run this locally once (and again whenever the access token expires):

    cd backend
    python -m market.shoonya_connect

It prints the Shoonya OAuth login URL, you log in in your browser, copy the
`code` value from the redirected URL, and paste it in here. The script exchanges
it for an access/refresh token and writes them into backend/.env. Your auth code
and tokens never leave your machine.

Required in backend/.env before running:
    SHOONYA_API_KEY      - the API key / client id from the Shoonya API page
    SHOONYA_API_SECRET   - the "Secret Code" from the same page
    SHOONYA_USER_ID      - your Shoonya login/client id (e.g. FA308060)
Optional overrides (sensible defaults below):
    SHOONYA_HOST, SHOONYA_WS, SHOONYA_OAUTH_URL
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from NorenRestApiPy.NorenApi import NorenApi

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"

DEFAULT_HOST = "https://api.shoonya.com/NorenWClientAPI/"
DEFAULT_WS = "wss://api.shoonya.com/NorenWSAPI/"
DEFAULT_OAUTH_URL = "https://trade.shoonya.com/OAuthlogin/investor-entry-level/login"


def _upsert_env(path: Path, updates: dict) -> None:
    """Insert or replace KEY=value lines in a .env file, preserving the rest."""
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

    api_key = os.getenv("SHOONYA_API_KEY")
    secret = os.getenv("SHOONYA_API_SECRET")
    uid = os.getenv("SHOONYA_USER_ID")
    host = os.getenv("SHOONYA_HOST", DEFAULT_HOST)
    ws = os.getenv("SHOONYA_WS", DEFAULT_WS)
    oauth_url = os.getenv("SHOONYA_OAUTH_URL", DEFAULT_OAUTH_URL)

    missing = [k for k, v in {
        "SHOONYA_API_KEY": api_key,
        "SHOONYA_API_SECRET": secret,
        "SHOONYA_USER_ID": uid,
    }.items() if not v]
    if missing:
        print(f"Missing in {ENV_PATH}: {', '.join(missing)}")
        return 1

    api = NorenApi(host=host, websocket=ws)
    login_url = api.getOAuthURL(oauth_url, api_key)

    print("\n1) Open this URL in your browser and log in to Shoonya:\n")
    print("   " + login_url)
    print("\n2) After login you'll be redirected to your registered URL.")
    print("   Copy the value of the `code` parameter from that redirected URL.\n")
    code = input("Paste the auth code here: ").strip()
    if not code:
        print("No code entered. Aborting.")
        return 1

    result = api.getAccessToken(code, secret, api_key, uid)
    if not result:
        print("Token exchange FAILED. The code may be expired/used, or the "
              "account may be inactive. Generate a fresh code and retry.")
        return 1

    access_token, usrid, refresh_token, actid = result
    _upsert_env(ENV_PATH, {
        "SHOONYA_ACCESS_TOKEN": access_token,
        "SHOONYA_REFRESH_TOKEN": refresh_token,
        "SHOONYA_ACTID": actid,
    })
    print(f"\n✅ Connected as {usrid}. Tokens saved to {ENV_PATH}.")
    print("   InvestMitra can now use Shoonya as its market-data provider.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
