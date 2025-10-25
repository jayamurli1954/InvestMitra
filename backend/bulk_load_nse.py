# bulk_load_nse.py
import requests
import io
import pandas as pd
from pymongo import MongoClient
from datetime import datetime

NSE_CSV_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"

def fetch_nse_list(url=NSE_CSV_URL):
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    # CSV sometimes uses different encodings; let pandas handle it
    df = pd.read_csv(io.StringIO(resp.text))
    return df

def to_doc(row):
    symbol = str(row.get("SYMBOL") or "").strip()
    name = str(row.get("NAME OF COMPANY") or "").strip()
    if not symbol:
        return None
    # append .NS for uniformity
    sym_ns = symbol + ".NS" if not symbol.endswith(".NS") else symbol
    return {
        "symbol": sym_ns,
        "name": name,
        "exchange": "NSE",
        "sector": row.get("Industry", "") if "Industry" in row else "",
        "meta": {"added_by": "bulk_nse", "created_at": datetime.utcnow()}
    }

def main():
    print("Downloading NSE list...")
    df = fetch_nse_list()
    print(f"Rows downloaded: {len(df)}")
    docs = []
    for _, r in df.iterrows():
        d = to_doc(r)
        if d:
            docs.append(d)

    client = MongoClient("mongodb://localhost:27017")
    db = client["investment_framework"]
    coll = db.stocks

    # Upsert each doc to avoid duplicates
    inserted = 0
    for doc in docs:
        res = coll.update_one({"symbol": doc["symbol"]}, {"$setOnInsert": doc}, upsert=True)
        # count of upserts is not direct; keep a simple increment if it was inserted (nModified==0 and upserted_id exists)
        if getattr(res, "upserted_id", None):
            inserted += 1

    total = coll.count_documents({})
    print(f"Inserted new: {inserted} — total documents now: {total}")
    client.close()

if __name__ == "__main__":
    main()
