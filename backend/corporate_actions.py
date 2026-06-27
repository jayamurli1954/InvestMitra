import logging
import asyncio
from datetime import datetime, timezone
import yfinance as yf
from bson import ObjectId

logger = logging.getLogger(__name__)

async def process_user_corporate_actions(db, user_id: str) -> dict:
    """
    Scans user portfolio for Stock Splits and Bonus Shares via yfinance corporate actions data.
    Adjusts quantities and average purchase prices automatically while preserving total invested capital.
    """
    if db is None:
        return {"processed": 0, "adjusted": 0, "details": []}

    processed_count = 0
    adjusted_count = 0
    details = []

    try:
        # Get user stock holdings
        holdings = await db.portfolio.find({
            "user_id": user_id,
            "$or": [{"asset_type": "STOCK"}, {"asset_type": None}]
        }).to_list(500)

        for holding in holdings:
            symbol = holding.get("symbol")
            current_qty = float(holding.get("quantity", 0))
            current_price = float(holding.get("purchase_price", 0))
            holding_id = str(holding.get("_id") or holding.get("id"))

            if not symbol or current_qty <= 0:
                continue

            processed_count += 1

            # Run blocking yfinance call in thread
            def fetch_actions():
                try:
                    t = yf.Ticker(symbol)
                    return t.splits
                except Exception as err:
                    logger.warning(f"Failed to fetch actions for {symbol}: {err}")
                    return None

            splits = await asyncio.to_thread(fetch_actions)

            if splits is None or splits.empty:
                continue

            purchase_date = holding.get("purchase_date", "")

            # Iterate through historical splits/bonus events
            for split_date, ratio in splits.items():
                ratio = float(ratio)
                if ratio <= 1.0: # Skip 1:1 non-splits or negative splits
                    continue

                date_str = split_date.strftime("%Y-%m-%d")

                # Skip corporate actions that occurred on or before purchase date
                if purchase_date and date_str <= purchase_date:
                    continue

                # Check if this corporate action was already applied to this holding
                already_applied = await db.corporate_action_logs.find_one({
                    "user_id": user_id,
                    "symbol": symbol,
                    "action_date": date_str,
                    "ratio": ratio
                })

                if already_applied:
                    continue

                # Calculate adjusted quantity and purchase price
                new_qty = current_qty * ratio
                new_price = current_price / ratio if current_price > 0 else 0.0

                # Update portfolio document
                query = {"_id": ObjectId(holding_id)} if ObjectId.is_valid(holding_id) else {"id": holding_id}
                await db.portfolio.update_one(
                    query,
                    {"$set": {
                        "quantity": new_qty,
                        "purchase_price": new_price,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )

                # Record audit log to prevent duplicate processing
                log_entry = {
                    "user_id": user_id,
                    "symbol": symbol,
                    "action_type": "BONUS_SPLIT",
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
                    "user_id": user_id,
                    "symbol": symbol,
                    "name": holding.get("name", symbol),
                    "type": "CORPORATE_ACTION",
                    "quantity": new_qty - current_qty,
                    "purchase_price": 0.0,
                    "total_amount": 0.0,
                    "date": date_str,
                    "notes": f"Automated Corporate Action: {ratio}:1 Bonus/Split adjustment"
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

                # Update current variables for subsequent loop iterations
                current_qty = new_qty
                current_price = new_price

    except Exception as e:
        logger.error(f"Error in corporate action processor for user {user_id}: {e}")

    return {
        "processed": processed_count,
        "adjusted": adjusted_count,
        "details": details
    }
