"""
Map a broker provider's normalized holdings into the app's PortfolioHolding
shape, for auto-importing a user's holdings into their consolidated portfolio.

The existing Portfolio already stores holdings per-user with a `broker` tag and
consolidates/filters by broker, so importing is just upserting these rows. Each
imported row carries source="broker_import" so the sync can update previously
imported holdings without touching rows the user entered by hand.
"""

from datetime import date
from typing import List, Dict, Any


def provider_holdings_to_portfolio(user_id: str, broker: str,
                                   holdings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Convert normalized provider holdings -> PortfolioHolding-shaped dicts."""
    today = date.today().isoformat()
    rows: List[Dict[str, Any]] = []
    for h in holdings or []:
        sym = (h.get("symbol") or "").strip()
        if not sym:
            continue
        exchange = h.get("exchange", "NSE")
        # The app keys Indian equities with a .NS suffix (yfinance style).
        app_symbol = f"{sym}.NS" if exchange == "NSE" and not sym.endswith((".NS", ".BO")) else sym
        rows.append({
            "user_id": user_id,
            "symbol": app_symbol,
            "name": h.get("name") or sym,
            "quantity": float(h.get("quantity") or 0),
            "purchase_price": float(h.get("avg_cost") or 0),
            # Brokers don't expose the original buy date in the holdings snapshot;
            # use the import date (users can edit it).
            "purchase_date": today,
            "asset_type": "STOCK",
            "current_price": float(h.get("ltp") or 0),
            "broker": broker,
            "exchange": exchange,
            "source": "broker_import",
        })
    return rows
