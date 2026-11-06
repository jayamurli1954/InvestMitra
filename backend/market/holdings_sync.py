"""
Map a broker provider's normalized holdings into the app's PortfolioHolding
shape, for auto-importing a user's holdings into their consolidated portfolio.

The existing Portfolio already stores holdings per-user with a `broker` tag and
consolidates/filters by broker, so importing is just upserting these rows. Each
imported row carries source="broker_import" so the sync can update previously
imported holdings without touching rows the user entered by hand.
"""

import uuid
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


async def sync_user_broker_holdings(db, user_id: str, providers) -> Dict[str, Any]:
    """Import holdings for a user from their connected brokers into db.portfolio.

    Non-destructive and idempotent per broker:
    - Clears this broker's prior auto-imports, then inserts the current snapshot.
    - SKIPS any symbol the user already tracks by hand (source != broker_import),
      so hand-entered holdings are never duplicated or double-counted.
    Returns {broker: {imported, skipped_manual: [symbols]}}.
    """
    summary: Dict[str, Any] = {}
    # Symbols the user already holds manually (any source other than broker_import)
    existing = await db.portfolio.find(
        {"user_id": user_id}, {"_id": 0, "symbol": 1, "source": 1}
    ).to_list(5000)
    manual_symbols = {e.get("symbol") for e in existing if e.get("source") != "broker_import"}

    for name, provider in providers:
        try:
            raw = provider.get_holdings()
        except Exception:
            raw = []
        rows = provider_holdings_to_portfolio(user_id, name, raw)
        # Idempotent: drop this broker's previous import before re-inserting.
        await db.portfolio.delete_many(
            {"user_id": user_id, "broker": name, "source": "broker_import"}
        )
        imported, skipped = [], []
        for r in rows:
            if r["symbol"] in manual_symbols:
                skipped.append(r["symbol"])
                continue
            r["id"] = str(uuid.uuid4())
            imported.append(r)
        if imported:
            await db.portfolio.insert_many(imported)
        summary[name] = {"imported": len(imported), "skipped_manual": skipped}
    return summary
