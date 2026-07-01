import logging
import asyncio
from datetime import datetime, timezone
import yfinance as yf
from bson import ObjectId

logger = logging.getLogger(__name__)

# Known Indian Market Corporate Actions (Bonus & Splits) master registry
# Uses cleaned base symbols to prevent duplicate matching
KNOWN_CORPORATE_ACTIONS = {
    "NMDC": [
        {"action_date": "2024-12-27", "ratio": 3.0, "type": "2:1 BONUS"}
    ],
    "RELIANCE": [
        {"action_date": "2024-10-28", "ratio": 2.0, "type": "1:1 BONUS"}
    ],
    "WIPRO": [
        {"action_date": "2024-12-03", "ratio": 2.0, "type": "1:1 BONUS"}
    ],
    "BPCL": [
        {"action_date": "2024-06-21", "ratio": 2.0, "type": "1:1 BONUS"}
    ],
    "HPCL": [
        {"action_date": "2024-06-21", "ratio": 1.5, "type": "1:2 BONUS"}
    ]
}

async def process_user_corporate_actions(db, user_id: str) -> dict:
    """
    Scans user portfolio for Stock Splits and Bonus Shares via master registry and yfinance.
    Adjusts quantities and average purchase prices automatically while preserving total invested capital.
    """
    if db is None:
        return {"processed": 0, "adjusted": 0, "details": []}

    processed_count = 0
    adjusted_count = 0
    details = []

    try:
        holdings = await db.portfolio.find({
            "user_id": user_id,
            "$or": [{"asset_type": "STOCK"}, {"asset_type": None}]
        }).to_list(500)

        for holding in holdings:
            symbol = holding.get("symbol")
            current_qty = float(holding.get("quantity", 0))
            current_price = float(holding.get("purchase_price", 0))
            holding_db_id = holding.get("_id")

            if not symbol or current_qty <= 0:
                continue

            processed_count += 1
            raw_p_date = str(holding.get("purchase_date", ""))
            purchase_date_clean = raw_p_date[:10] if raw_p_date else ""

            candidate_actions = []

            # 1. Check Known Corporate Actions using cleaned base symbol
            sym_clean = symbol.upper().replace(".NS", "").replace(".BO", "")
            if sym_clean in KNOWN_CORPORATE_ACTIONS:
                for act in KNOWN_CORPORATE_ACTIONS[sym_clean]:
                    candidate_actions.append(act)

            # 2. Fetch from yfinance as fallback / supplemental
            def fetch_actions():
                try:
                    t = yf.Ticker(symbol)
                    return t.splits
                except Exception as err:
                    logger.warning(f"Failed to fetch yfinance actions for {symbol}: {err}")
                    return None

            splits = await asyncio.to_thread(fetch_actions)
            if splits is not None and not splits.empty:
                for split_date, ratio in splits.items():
                    ratio_val = float(ratio)
                    if ratio_val > 1.0:
                        date_str = split_date.strftime("%Y-%m-%d")
                        candidate_actions.append({"action_date": date_str, "ratio": ratio_val, "type": f"{ratio_val}:1 SPLIT/BONUS"})

            # Deduplicate candidate actions by action_date
            unique_actions = {}
            for act in candidate_actions:
                d = act["action_date"]
                if d not in unique_actions or act["ratio"] > unique_actions[d]["ratio"]:
                    unique_actions[d] = act

            for date_str, act in sorted(unique_actions.items()):
                ratio = act["ratio"]
                action_label = act.get("type", "BONUS_SPLIT")

                # Skip actions that occurred prior to purchase date (unless known bonus like NMDC where date alignment might differ)
                if purchase_date_clean and date_str < purchase_date_clean and sym_clean != "NMDC":
                    continue

                # 1. Check if already applied to this specific holding using holding document field
                applied_actions = holding.get("applied_corporate_actions", [])
                if date_str in applied_actions:
                    continue

                # 2. Fall back to external logs for legacy holdings
                already_applied_legacy = await db.corporate_action_logs.find_one({
                    "user_id": user_id,
                    "symbol": symbol,
                    "action_date": date_str
                })
                if already_applied_legacy:
                    # If the logged old_quantity matches current quantity, the log is from a deleted holding
                    if float(already_applied_legacy.get("old_quantity", 0)) == current_qty:
                        log_db_id = already_applied_legacy.get("_id")
                        if log_db_id:
                            await db.corporate_action_logs.delete_one({"_id": log_db_id})
                        else:
                            await db.corporate_action_logs.delete_one({
                                "user_id": user_id,
                                "symbol": symbol,
                                "action_date": date_str
                            })
                        logger.info(f"Cleared stale legacy log for {symbol} on {date_str} because current qty {current_qty} matches logged old_qty")
                    else:
                        # Legacy log is valid, upgrade document to new structure and skip
                        await db.portfolio.update_one(
                            {"_id": holding_db_id},
                            {"$push": {"applied_corporate_actions": date_str}}
                        )
                        continue

                # Calculate adjusted quantity and purchase price
                new_qty = current_qty * ratio
                new_price = current_price / ratio if current_price > 0 else 0.0

                # Target exact document ID to avoid collateral over-multiplication
                if holding_db_id:
                    await db.portfolio.update_one(
                        {"_id": holding_db_id},
                        {
                            "$set": {
                                "quantity": int(new_qty) if new_qty.is_integer() else new_qty,
                                "purchase_price": new_price,
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            },
                            "$push": {
                                "applied_corporate_actions": date_str
                            }
                        }
                    )

                # Record audit log entry
                log_entry = {
                    "user_id": user_id,
                    "symbol": symbol,
                    "action_type": action_label,
                    "action_date": date_str,
                    "ratio": ratio,
                    "old_quantity": current_qty,
                    "new_quantity": new_qty,
                    "old_price": current_price,
                    "new_price": new_price,
                    "applied_at": datetime.now(timezone.utc).isoformat()
                }
                await db.corporate_action_logs.insert_one(log_entry)

                # Record transaction history entry for ledger tracking
                txn_entry = {
                    "id": str(ObjectId()),
                    "user_id": user_id,
                    "symbol": symbol,
                    "name": holding.get("name", symbol),
                    "transaction_type": "buy",
                    "quantity": new_qty - current_qty,
                    "price": 0.0,
                    "total_amount": 0.0,
                    "transaction_date": date_str,
                    "notes": f"Automated Corporate Action: {action_label} adjustment"
                }
                await db.transactions.insert_one(txn_entry)

                adjusted_count += 1
                details.append({
                    "symbol": symbol,
                    "ratio": ratio,
                    "date": date_str,
                    "old_qty": current_qty,
                    "new_qty": new_qty
                })

                current_qty = new_qty
                current_price = new_price

    except Exception as e:
        logger.error(f"Error in corporate action processor for user {user_id}: {e}")

    return {
        "processed": processed_count,
        "adjusted": adjusted_count,
        "details": details
    }
