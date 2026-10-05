"""Build the `rag_documents` collection the RAG chat retrieves from: one text summary per
vessel (identity, risk counters, notable at-sea events) and one per agent alert, each
embedded once with OpenAI so queries only need a single embedding call.

Run after build_app_collections.py and ship_monitor_agent.py:
    python build_rag_index.py
"""
import os
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List

from dotenv import load_dotenv
from openai import OpenAI
from pymongo import MongoClient

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

EMBEDDING_MODEL = "text-embedding-3-small"
NOTABLE_TYPES = ("gap", "encounter", "loitering")


def _region_note(event: Dict[str, Any]) -> str:
    regions = event.get("regions") or {}
    notes = []
    if regions.get("mpaNoTake") or regions.get("mpaNoTakePartial"):
        notes.append("inside a no-take marine protected area")
    elif regions.get("mpa"):
        notes.append("inside a marine protected area")
    if regions.get("highSeas"):
        notes.append("on the high seas")
    if regions.get("rfmo"):
        notes.append("RFMO " + "/".join(regions["rfmo"][:2]))
    return ", ".join(notes)


def _describe_event(event: Dict[str, Any]) -> str:
    kind = event.get("type")
    pos = event.get("position") or {}
    where = f"at {pos.get('lat', 0):.2f},{pos.get('lon', 0):.2f}"
    when = (event.get("start") or "")[:10]
    detail = ""
    if kind == "gap" and event.get("gap"):
        gap = event["gap"]
        detail = f"AIS off for {gap.get('durationHours', 0):.0f}h"
        if gap.get("intentionalDisabling"):
            detail += " (likely intentional)"
    elif kind == "encounter" and event.get("encounter"):
        other = event["encounter"].get("vessel") or {}
        detail = f"met {other.get('name') or 'another vessel'} ({other.get('flag') or '?'} {other.get('type') or ''})".strip()
    elif kind == "loitering" and event.get("loitering"):
        detail = f"loitered {event['loitering'].get('totalTimeHours', 0):.0f}h"
    region = _region_note(event)
    return f"{when} {kind}: {detail} {where}{'; ' + region if region else ''}".strip()


def vessel_document(vessel: Dict[str, Any], raw_events: List[Dict[str, Any]]) -> Dict[str, Any]:
    counts = Counter(e.get("type") for e in raw_events)
    notable = sorted((e for e in raw_events if e.get("type") in NOTABLE_TYPES),
                     key=lambda e: e.get("start") or "", reverse=True)[:8]
    lines = [
        f"Vessel {vessel.get('name') or 'unknown'} (id {vessel['vessel_id']}), "
        f"flag {vessel.get('flag') or 'unknown'}, type {vessel.get('type') or 'unknown'}, MMSI {vessel.get('mmsi') or 'n/a'}.",
        f"Last known position {vessel.get('lat')}, {vessel.get('lon')}.",
        f"Risk counters: {vessel.get('aisOff_count', 0)} AIS gaps, "
        f"{vessel.get('eventsInNoTakeMpas_count', 0)} events in no-take MPAs, "
        f"{vessel.get('eventsInRfmoWithoutKnownAuthorization_count', 0)} RFMO events without known authorization.",
        "Event counts: " + (", ".join(f"{n} {t}" for t, n in counts.most_common()) or "none") + ".",
    ]
    if notable:
        lines.append("Recent notable events: " + "; ".join(_describe_event(e) for e in notable) + ".")
    return {
        "doc_id": f"vessel:{vessel['vessel_id']}",
        "content": "\n".join(lines),
        "metadata": {"document_type": "vessel_info", "source_collection": "vessel",
                     "ship_id": vessel["vessel_id"], "timestamp": str(vessel.get("updated_at") or "")},
        "name": vessel.get("name"), "type": vessel.get("type"), "flag": vessel.get("flag"),
    }


def alert_document(alert: Dict[str, Any]) -> Dict[str, Any]:
    loc = alert.get("location") or {}
    content = (
        f"{str(alert.get('severity', '')).upper()} {alert.get('alert_type')} alert for {alert.get('ship_name') or alert.get('ship_id')} "
        f"on {str(alert.get('timestamp'))[:10]} at {loc.get('latitude')}, {loc.get('longitude')}.\n"
        f"{alert.get('description')}\nReasoning: {alert.get('reasoning')}\n"
        f"Evidence: {'; '.join(alert.get('evidence') or [])}"
    )
    return {
        "doc_id": f"alert:{alert['alert_id']}",
        "content": content,
        "metadata": {"document_type": "alert", "source_collection": "ship_alerts",
                     "ship_id": alert.get("ship_id"), "timestamp": str(alert.get("timestamp"))},
        "alert_type": alert.get("alert_type"), "severity": alert.get("severity"), "ship_name": alert.get("ship_name"),
    }


def main() -> None:
    db = MongoClient(os.environ["MONGODB_URI"], serverSelectionTimeoutMS=10000)[os.environ.get("MONGODB_DB", "main")]
    client = OpenAI()

    events_by_vessel: Dict[str, List[Dict[str, Any]]] = {}
    for e in db.gfw_ship_events.find({}, {"_id": 0, "vessel_id": 1, "type": 1, "start": 1, "position": 1,
                                          "regions": 1, "gap": 1, "encounter": 1, "loitering": 1}):
        events_by_vessel.setdefault(e["vessel_id"], []).append(e)

    docs = [vessel_document(v, events_by_vessel.get(v["vessel_id"], []))
            for v in db.vessel.find({"noEvents": False}, {"_id": 0})]
    docs += [alert_document(a) for a in db.ship_alerts.find({}, {"_id": 0})]

    for i in range(0, len(docs), 100):
        batch = docs[i:i + 100]
        response = client.embeddings.create(model=EMBEDDING_MODEL, input=[d["content"] for d in batch])
        for doc, item in zip(batch, response.data):
            doc["embedding"] = item.embedding
            doc["embedded_at"] = datetime.now(timezone.utc)

    # Build into a staging collection, then swap it in
    staging = db["rag_documents_staging"]
    staging.drop()
    if docs:
        staging.insert_many(docs)
        staging.rename("rag_documents", dropTarget=True)
    kinds = Counter(d["metadata"]["document_type"] for d in docs)
    print(f"rag_documents: {len(docs)} embedded ({dict(kinds)})")


if __name__ == "__main__":
    main()
