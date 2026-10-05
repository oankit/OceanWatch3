"""Build the `vessel` and `events` collections the web client reads from the raw
`gfw_ships` / `gfw_ship_events` collections written by fetch_gfw_to_mongo.py.

Usage (after fetch_gfw_to_mongo.py --write-events-collection):
    python build_app_collections.py
"""
import math
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from pymongo import ASCENDING, IndexModel, MongoClient, ReplaceOne


def parse_time(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def compute_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_lambda = math.radians(lon2 - lon1)
    y = math.sin(d_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lambda)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def to_app_event(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    position = raw.get("position") or {}
    lat, lon = position.get("lat"), position.get("lon")
    if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        return None
    regions = raw.get("regions") or {}
    return {
        "id": raw.get("id"),
        "vessel_id": raw["vessel_id"],
        "name": raw.get("name"),
        "event_type": raw.get("type"),
        "latitude": lat,
        "longitude": lon,
        "timestamp": parse_time(raw.get("start")),
        "event_end": parse_time(raw.get("end")),
        "in_no_take_mpa": bool(regions.get("mpaNoTake") or regions.get("mpaNoTakePartial")),
        "dataset": raw.get("_datasetId"),
    }


def first(items: Any) -> Dict[str, Any]:
    return items[0] if isinstance(items, list) and items and isinstance(items[0], dict) else {}


def to_app_vessel(ship: Dict[str, Any], events: List[Dict[str, Any]]) -> Dict[str, Any]:
    insights = ship.get("insights") or {}
    counters = insights.get("periodSelectedCounters") or {}
    details = ship.get("details") or {}
    self_reported = first(details.get("self_reported_info"))
    combined = first(details.get("combined_sources_info"))
    ship_type = first(combined.get("shiptypes")).get("name")

    ordered = sorted(
        (e for e in events if e["timestamp"] or e["event_end"]),
        key=lambda e: e["event_end"] or e["timestamp"],
    )
    doc: Dict[str, Any] = {
        "vessel_id": ship["vessel_id"],
        "name": self_reported.get("shipname") or ship.get("name"),
        "shipname": self_reported.get("shipname") or ship.get("name"),
        "ssvid": self_reported.get("ssvid"),
        "mmsi": self_reported.get("ssvid"),
        "imo": self_reported.get("imo"),
        "flag": self_reported.get("flag"),
        "callsign": self_reported.get("callsign"),
        "type": ship_type,
        "events_count": len(events),
        "events_counts_by_dataset": ship.get("events_counts_by_dataset"),
        # Risk signals used for marker colour and the heat map
        "aisOff_count": sum(1 for e in events if e["event_type"] == "gap"),
        "eventsInNoTakeMpas_count": max(
            int(counters.get("eventsInNoTakeMPAs") or 0),
            sum(1 for e in events if e["in_no_take_mpa"]),
        ),
        "eventsInRfmoWithoutKnownAuthorization_count": int(counters.get("eventsInRFMOWithoutKnownAuthorization") or 0),
        "totalTimesListed_count": 0,
        "updated_at": ship.get("updated_at"),
    }

    if not ordered:
        doc.update({"lat": None, "lon": None, "bearing": 0, "noEvents": True})
        return doc

    last = ordered[-1]
    bearing = 0.0
    for prev in reversed(ordered[:-1]):
        if (prev["latitude"], prev["longitude"]) != (last["latitude"], last["longitude"]):
            bearing = compute_bearing(prev["latitude"], prev["longitude"], last["latitude"], last["longitude"])
            break
    doc.update({"lat": last["latitude"], "lon": last["longitude"], "bearing": bearing, "noEvents": False})
    return doc


def main() -> None:
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        raise ValueError("MONGODB_URI environment variable is required")
    db = MongoClient(uri, serverSelectionTimeoutMS=10000)[os.environ.get("MONGODB_DB", "main")]

    events_by_vessel: Dict[str, List[Dict[str, Any]]] = {}
    for raw in db["gfw_ship_events"].find({}, {"_id": 0}):
        event = to_app_event(raw)
        if event:
            events_by_vessel.setdefault(event["vessel_id"], []).append(event)

    vessel_ops, event_ops = [], []
    for ship in db["gfw_ships"].find({}, {"_id": 0}):
        events = events_by_vessel.get(ship["vessel_id"], [])
        vessel_ops.append(ReplaceOne({"vessel_id": ship["vessel_id"]}, to_app_vessel(ship, events), upsert=True))
        for e in events:
            app_event = {k: v for k, v in e.items() if k != "in_no_take_mpa"}
            event_ops.append(ReplaceOne({"vessel_id": e["vessel_id"], "id": e["id"]}, app_event, upsert=True))

    db["vessel"].create_indexes([IndexModel([("vessel_id", ASCENDING)], unique=True, name="vessel_id_unique")])
    db["events"].create_indexes([IndexModel([("vessel_id", ASCENDING), ("id", ASCENDING)], unique=True, name="vessel_event_unique")])
    if vessel_ops:
        db["vessel"].bulk_write(vessel_ops, ordered=False)
    if event_ops:
        db["events"].bulk_write(event_ops, ordered=False)

    flagged = db["vessel"].count_documents({"$expr": {"$gt": [
        {"$add": ["$aisOff_count", "$eventsInNoTakeMpas_count", "$eventsInRfmoWithoutKnownAuthorization_count"]}, 0]}})
    print(f"vessel: {len(vessel_ops)} docs ({flagged} with suspicious activity), events: {len(event_ops)} docs")


if __name__ == "__main__":
    main()
