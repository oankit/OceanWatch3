import os
import csv
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from importlib.machinery import SourceFileLoader
from pymongo import MongoClient, ASCENDING, IndexModel, UpdateOne
from pymongo.errors import BulkWriteError
from alive_progress import alive_bar

DEFAULT_EVENT_DATASETS = [
    "public-global-gaps-events:latest",
    "public-global-loitering-events:latest",
    "public-global-encounters-events:latest",
    "public-global-port-visits-events:latest",
]

def load_gfw_client():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    module_path = os.path.join(base_dir, "gfw-client.py")
    loader = SourceFileLoader("gfw_client", module_path)
    return loader.load_module()


def get_mongo_collections(write_events_collection: bool) -> Tuple[Any, Optional[Any]]:
    mongo_uri = os.getenv("MONGODB_URI", "mongodb+srv://johnliu:pword@neptune-main.2w2qohn.mongodb.net/main")
    db_name = os.getenv("MONGODB_DB", "main")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
    db = client[db_name]
    ships = db["gfw_ships"]
    ships.create_indexes([
        IndexModel([("vessel_id", ASCENDING)], unique=True, name="vessel_id_unique"),
        IndexModel([("name", ASCENDING)], name="name")
    ])
    events = None
    if write_events_collection:
        events = db["gfw_ship_events"]
        events.create_indexes([
            IndexModel([("vessel_id", ASCENDING), ("id", ASCENDING)], unique=True, name="vessel_event_unique"),
            IndexModel([("vessel_id", ASCENDING)], name="vessel_id")
        ])
    return ships, events


def read_vessels_from_csv(csv_path: str) -> List[Tuple[str, str]]:
    vessels: List[Tuple[str, str]] = []
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            vessel_id = str(row.get("vessel_id") or row.get("id") or "").strip()
            name = str(row.get("name") or "").strip()
            if vessel_id:
                vessels.append((vessel_id, name))
    return vessels


def to_dict(obj: Any) -> Any:
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "dict"):
        return obj.dict()
    return obj


def fetch_events_for_dataset(client, vessel_id: str, dataset_id: str, start_date: str, end_date: str, page_limit: int) -> Tuple[str, List[Dict[str, Any]], int]:
    entries: List[Dict[str, Any]] = []
    offset = 0
    total = 0
    while True:
        response = client.post_events(
            vessel_ids=[vessel_id],
            datasets=[dataset_id],
            start_date=start_date,
            end_date=end_date,
            limit=page_limit,
            offset=offset,
        )
        page_entries = [e if isinstance(e, dict) else to_dict(e) for e in (response.entries or [])]
        entries.extend([{**e, "_datasetId": dataset_id} for e in page_entries])
        total = response.total if hasattr(response, "total") else max(total, len(entries))
        if response.nextOffset is None:
            break
        offset = response.nextOffset
        time.sleep(0.05)
    return dataset_id, entries, total


def fetch_insights_details_and_events(gfw_client_cls, api_key: str, vessel_id: str, vessel_name: str, datasets: List[str], start_date: str, end_date: str, page_limit: int) -> Dict[str, Any]:
    client = gfw_client_cls(api_key)
    datasets_to_use = DEFAULT_EVENT_DATASETS if len(datasets) == 1 and datasets[0].lower() == "auto" else datasets
    events_all: List[Dict[str, Any]] = []
    events_counts_by_dataset: Dict[str, int] = {}
    for ds in datasets_to_use:
        ds_id, ds_entries, ds_total = fetch_events_for_dataset(client, vessel_id, ds, start_date, end_date, page_limit)
        events_all.extend(ds_entries)
        events_counts_by_dataset[ds_id] = ds_total
    if not events_all:
        return {
            "vessel_id": vessel_id,
            "name": vessel_name,
            "events": [],
            "events_counts_by_dataset": events_counts_by_dataset,
        }
    insights = client.get_vessel_insights(vessel_id=vessel_id, start_date=start_date, end_date=end_date)
    details = client.get_vessel_details(vessel_id=vessel_id)
    return {
        "vessel_id": vessel_id,
        "name": vessel_name,
        "insights": to_dict(insights),
        "details": to_dict(details),
        "events": events_all,
        "events_counts_by_dataset": events_counts_by_dataset,
    }


def upsert_ship_and_events(ships_col, events_col: Optional[Any], payload: Dict[str, Any], embed_events: bool) -> Dict[str, Any]:
    vessel_id = payload["vessel_id"]
    name = payload.get("name")
    insights = payload.get("insights")
    details = payload.get("details")
    events = payload.get("events", [])
    counts_by_ds = payload.get("events_counts_by_dataset", {})
    if not events:
        return {"vessel_id": vessel_id, "name": name, "events_written": 0, "skipped": True}
    now = datetime.now(timezone.utc)
    update_doc: Dict[str, Any] = {
        "vessel_id": vessel_id,
        "name": name,
        "insights": insights,
        "details": details,
        "events_count": len(events),
        "events_counts_by_dataset": counts_by_ds,
        "updated_at": now
    }
    if embed_events:
        update_doc["events"] = events
    ships_col.update_one(
        {"vessel_id": vessel_id},
        {"$set": update_doc},
        upsert=True
    )
    written_events = 0
    if events_col is not None and events:
        ops = []
        for e in events:
            event_id = e.get("id") if isinstance(e, dict) else None
            doc = {**e, "vessel_id": vessel_id, "name": name, "updated_at": now} if isinstance(e, dict) else {"vessel_id": vessel_id, "name": name, "payload": e, "updated_at": now}
            if event_id:
                ops.append(UpdateOne({"vessel_id": vessel_id, "id": event_id}, {"$set": doc}, upsert=True))
            else:
                ops.append(UpdateOne({"vessel_id": vessel_id, "id": None, "_rand": os.urandom(8).hex()}, {"$setOnInsert": doc}, upsert=True))
        try:
            res = events_col.bulk_write(ops, ordered=False)
            written_events = (res.upserted_count or 0) + (res.modified_count or 0)
        except BulkWriteError:
            written_events = len(events)
    return {"vessel_id": vessel_id, "events_written": written_events}


def run(csv_path: str, start_date: str, end_date: str, datasets: List[str], page_limit: int, max_workers: int, max_vessels: int = 0, embed_events: bool = True, write_events_collection: bool = False) -> Dict[str, Any]:
    gfw_module = load_gfw_client()
    gfw_client_cls = getattr(gfw_module, "GFWClient")
    api_key = os.environ.get("GFW_API_KEY") or getattr(gfw_module, "API_KEY")
    ships_col, events_col = get_mongo_collections(write_events_collection=write_events_collection)
    vessels = read_vessels_from_csv(csv_path)
    if max_vessels and max_vessels > 0:
        vessels = vessels[:max_vessels]
    results: List[Dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(fetch_insights_details_and_events, gfw_client_cls, api_key, vessel_id, name, datasets, start_date, end_date, page_limit): (vessel_id, name)
            for vessel_id, name in vessels
        }
        with alive_bar(len(futures), title="Fetching GFW data") as bar:
            for future in as_completed(futures):
                vessel_id, name = futures[future]
                try:
                    payload = future.result()
                    write_result = upsert_ship_and_events(ships_col, events_col, payload, embed_events=embed_events)
                    results.append({"vessel_id": vessel_id, "name": name, **write_result})
                except Exception as exc:
                    results.append({"vessel_id": vessel_id, "name": name, "error": str(exc)})
                bar()
    summary = {
        "total_vessels": len(vessels),
        "processed": len([r for r in results if "error" not in r]),
        "failed": [r for r in results if "error" in r]
    }
    return {"summary": summary, "results": results}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default=os.path.join(os.path.dirname(__file__), "data/test-data/vessels.csv"))
    parser.add_argument("--start-date", default="2023-01-01")
    parser.add_argument("--end-date", default="2025-12-31")
    parser.add_argument("--datasets", nargs="+", default=["auto"], help="Use 'auto' to fetch across common event datasets.")
    parser.add_argument("--page-limit", type=int, default=200)
    parser.add_argument("--max-workers", type=int, default=8)
    parser.add_argument("--max-vessels", type=int, default=0)
    parser.add_argument("--embed-events", action="store_true", default=True)
    parser.add_argument("--no-embed-events", dest="embed_events", action="store_false")
    parser.add_argument("--write-events-collection", action="store_true", default=False)
    args = parser.parse_args()
    output = run(
        csv_path=args.csv,
        start_date=args.start_date,
        end_date=args.end_date,
        datasets=args.datasets,
        page_limit=args.page_limit,
        max_workers=args.max_workers,
        max_vessels=args.max_vessels,
        embed_events=args.embed_events,
        write_events_collection=args.write_events_collection,
    )
    print(output) 