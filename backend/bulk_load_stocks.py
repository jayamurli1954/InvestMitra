# bulk_load_stocks.py
import requests
import io
import pandas as pd
from pymongo import MongoClient
from datetime import datetime
import argparse

def fetch_stock_list(url):
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    df = pd.read_csv(io.StringIO(resp.text))
    return df

def to_doc(row, exchange, symbol_col, name_col, sector_col):
    symbol = str(row.get(symbol_col) or "").strip()
    name = str(row.get(name_col) or "").strip()
    if not symbol:
        return None
    
    if exchange == "NSE" and not symbol.endswith(".NS"):
        symbol = f"{symbol}.NS"

    return {
        "symbol": symbol,
        "name": name,
        "exchange": exchange,
        "sector": row.get(sector_col, "") if sector_col in row else "",
        "meta": {"added_by": f"bulk_{exchange.lower()}", "created_at": datetime.utcnow()}
    }

def main():
    parser = argparse.ArgumentParser(description="Bulk load stocks from a CSV URL.")
    parser.add_argument("--exchange", required=True, help="The stock exchange name (e.g., NSE, NYSE).")
    parser.add_argument("--url", required=True, help="The URL of the CSV file.")
    parser.add_argument("--symbol-col", default="SYMBOL", help="The name of the symbol column in the CSV.")
    parser.add_argument("--name-col", default="NAME OF COMPANY", help="The name of the company name column in the CSV.")
    parser.add_argument("--sector-col", default="Industry", help="The name of the sector column in the CSV.")
    args = parser.parse_args()

    print(f"Downloading {args.exchange} list...")
    df = fetch_stock_list(args.url)
    print(f"Rows downloaded: {len(df)}")
    docs = []
    for _, r in df.iterrows():
        d = to_doc(r, args.exchange, args.symbol_col, args.name_col, args.sector_col)
        if d:
            docs.append(d)

    client = MongoClient("mongodb://localhost:27017")
    db = client["investment_framework"]
    coll = db.stocks

    # Upsert each doc to avoid duplicates
    inserted = 0
    for doc in docs:
        res = coll.update_one({"symbol": doc["symbol"]}, {"$setOnInsert": doc}, upsert=True)
        if getattr(res, "upserted_id", None):
            inserted += 1

    total = coll.count_documents({})
    print(f"Inserted new: {inserted} — total documents now: {total}")
    client.close()

if __name__ == "__main__":
    main()
