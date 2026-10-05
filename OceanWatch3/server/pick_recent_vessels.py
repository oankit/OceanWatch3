"""Write a vessels CSV (vessel_id,name) of ships with recent at-sea risk events, for
fetch_gfw_to_mongo.py --csv. Picks vessels from the most recent AIS gap and encounter
events worldwide, so the loaded data reflects current activity.

Usage:
    python pick_recent_vessels.py --out recent_vessels.csv --days 60 --per-dataset 120
"""
import argparse
import csv
import importlib.machinery
import os
from datetime import datetime, timedelta, timezone

import requests

GFW_EVENTS_URL = "https://gateway.api.globalfishingwatch.org/v3/events"
DATASETS = ["public-global-gaps-events:latest", "public-global-encounters-events:latest"]


def gfw_api_key() -> str:
    key = os.environ.get("GFW_API_KEY")
    if key:
        return key
    module_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gfw-client.py")
    return importlib.machinery.SourceFileLoader("gfw_client", module_path).load_module().API_KEY


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="recent_vessels.csv")
    parser.add_argument("--days", type=int, default=60)
    parser.add_argument("--per-dataset", type=int, default=120, help="max vessels to take from each dataset")
    args = parser.parse_args()

    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=args.days)
    headers = {"Authorization": f"Bearer {gfw_api_key()}", "Content-Type": "application/json"}

    picked: dict = {}
    for dataset in DATASETS:
        taken, offset = 0, 0
        while taken < args.per_dataset:
            resp = requests.post(f"{GFW_EVENTS_URL}?limit=200&offset={offset}", headers=headers, timeout=60,
                                 json={"datasets": [dataset], "startDate": start.isoformat(), "endDate": end.isoformat()})
            resp.raise_for_status()
            page = resp.json()
            for event in page.get("entries", []):
                vessel = event.get("vessel") or {}
                if vessel.get("id") and vessel["id"] not in picked:
                    picked[vessel["id"]] = vessel.get("name") or ""
                    taken += 1
                    if taken >= args.per_dataset:
                        break
            if page.get("nextOffset") is None:
                break
            offset = page["nextOffset"]
        print(f"{dataset}: {taken} vessels")

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["vessel_id", "name"])
        writer.writerows(picked.items())
    print(f"Wrote {len(picked)} vessels with events between {start} and {end} to {args.out}")


if __name__ == "__main__":
    main()
