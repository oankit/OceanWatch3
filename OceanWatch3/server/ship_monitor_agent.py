"""OceanWatch ship monitor agent.

An LLM agent (LangChain + OpenAI) that investigates vessels using Global Fishing Watch
event data in MongoDB and raises alerts with its reasoning and evidence.

Usage:
    python ship_monitor_agent.py                 # one scan over the riskiest vessels
    python ship_monitor_agent.py --max-ships 10  # smaller scan
    python ship_monitor_agent.py --watch 60      # rescan every 60 minutes

Reads MONGODB_URI, MONGODB_DB, OPENAI_API_KEY and optionally OPENAI_MODEL and
PERPLEXITY_API_KEY (enables the maritime news tool).
"""
import argparse
import hashlib
import json
import os
import time
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, ConfigDict
from pymongo import MongoClient

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

MONGODB_URI = os.getenv("MONGODB_URI", "")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is required")
DB_NAME = os.getenv("MONGODB_DB", "main")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-6-luna")

PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

db = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10000)[DB_NAME]


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(str, Enum):
    LOITERING = "loitering"
    PORT_ENTRY = "port_entry"
    PORT_EXIT = "port_exit"
    SUSPICIOUS_ROUTE = "suspicious_route"
    SPEED_ANOMALY = "speed_anomaly"
    ENCOUNTER = "encounter"
    GAP_IN_TRACKING = "gap_in_tracking"


class AlertLocation(BaseModel):
    latitude: float
    longitude: float


class Alert(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    alert_id: str
    timestamp: datetime  # when the suspicious activity happened
    detected_at: datetime  # when the agent raised the alert
    ship_id: str
    ship_name: Optional[str] = None
    alert_type: AlertType
    severity: AlertSeverity
    location: Optional[AlertLocation] = None
    description: str
    reasoning: str
    evidence: List[str] = []
    event_id: Optional[str] = None
    model: str = OPENAI_MODEL
    status: str = "active"


def _parse_time(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _compact_event(e: Dict[str, Any]) -> Dict[str, Any]:
    """Keep the fields that matter for judging behaviour, so tool output stays small."""
    regions = e.get("regions") or {}
    start, end = _parse_time(e.get("start")), _parse_time(e.get("end"))
    out: Dict[str, Any] = {
        "event_id": e.get("id"),
        "type": e.get("type"),
        "start": start.isoformat() if start else None,
        "end": end.isoformat() if end else None,
        "duration_hours": round((end - start).total_seconds() / 3600, 1) if start and end else None,
        "lat": (e.get("position") or {}).get("lat"),
        "lon": (e.get("position") or {}).get("lon"),
        "in_no_take_mpa": bool(regions.get("mpaNoTake") or regions.get("mpaNoTakePartial")),
        "in_mpa": bool(regions.get("mpa")),
        "high_seas": bool(regions.get("highSeas")),
        "eez": regions.get("eez"),
        "rfmo": regions.get("rfmo"),
        "distance_from_shore_km": (e.get("distances") or {}).get("startDistanceFromShoreKm"),
    }
    if e.get("encounter"):
        enc = e["encounter"]
        other = enc.get("vessel") or {}
        out["encounter"] = {
            "other_vessel": other.get("name") or other.get("id"),
            "other_flag": other.get("flag"),
            "other_type": other.get("type"),
            "median_speed_knots": enc.get("medianSpeedKnots"),
        }
    if e.get("gap"):
        gap = e["gap"]
        out["gap"] = {
            "hours": gap.get("durationHours"),
            "distance_km": gap.get("distanceKm"),
            "implied_speed_knots": gap.get("impliedSpeedKnots"),
            "intentional_disabling": gap.get("intentionalDisabling"),
        }
    if e.get("loitering"):
        loit = e["loitering"]
        out["loitering"] = {"hours": loit.get("totalTimeHours"), "avg_speed_knots": loit.get("averageSpeedKnots")}
    if e.get("port_visit"):
        anchorage = (e["port_visit"].get("startAnchorage") or {})
        out["port"] = {"name": anchorage.get("name"), "flag": anchorage.get("flag")}
    return {k: v for k, v in out.items() if v not in (None, [], {})}


@tool
def get_vessel_profile(vessel_id: str) -> str:
    """Get a vessel's identity (name, flag, type, MMSI), its last known position and its
    summary risk counters (AIS gaps, events in no-take MPAs, unauthorised RFMO fishing)."""
    v = db.vessel.find_one({"vessel_id": vessel_id}, {"_id": 0, "events_counts_by_dataset": 0})
    if not v:
        return json.dumps({"error": f"vessel {vessel_id} not found"})
    return json.dumps(v, default=str)


@tool
def get_vessel_events(vessel_id: str, days: int = 365, event_type: Optional[str] = None, limit: int = 40) -> str:
    """List a vessel's most recent events, newest first. event_type can be one of
    'gap' (AIS transponder off), 'loitering', 'encounter' (meeting another vessel at sea)
    or 'port_visit'. Each event includes position, duration and region context such as
    whether it was inside a no-take marine protected area or on the high seas."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    query: Dict[str, Any] = {"vessel_id": vessel_id}
    if event_type:
        query["type"] = event_type
    events = [e for e in db.gfw_ship_events.find(query, {"_id": 0}) if (_parse_time(e.get("start")) or since) >= since]
    events.sort(key=lambda e: e.get("start") or "", reverse=True)
    counts: Dict[str, int] = {}
    for e in events:
        counts[e.get("type", "unknown")] = counts.get(e.get("type", "unknown"), 0) + 1
    return json.dumps({"total": len(events), "counts_by_type": counts,
                       "events": [_compact_event(e) for e in events[:min(limit, 60)]]}, default=str)


@tool
def create_alert(vessel_id: str, alert_type: AlertType, severity: AlertSeverity, description: str,
                 reasoning: str, evidence: List[str], event_id: Optional[str] = None) -> str:
    """Raise an alert for suspicious behaviour. Link it to the event_id it is mainly about
    so it is placed at that event's time and position. Only raise alerts the evidence
    supports; reasoning should explain why the behaviour is suspicious, not just restate it."""
    vessel = db.vessel.find_one({"vessel_id": vessel_id}, {"name": 1, "lat": 1, "lon": 1})
    if not vessel:
        return f"Error: vessel {vessel_id} not found"
    event = db.gfw_ship_events.find_one({"vessel_id": vessel_id, "id": event_id}) if event_id else None
    when = (_parse_time(event.get("end")) or _parse_time(event.get("start"))) if event else None
    position = (event or {}).get("position") or {}
    lat, lon = position.get("lat", vessel.get("lat")), position.get("lon", vessel.get("lon"))

    # Deterministic id so re-running a scan updates an alert instead of duplicating it
    alert_id = "alert_" + hashlib.sha1(f"{vessel_id}:{event_id}:{AlertType(alert_type).value}".encode()).hexdigest()[:16]
    alert = Alert(
        alert_id=alert_id,
        timestamp=when or datetime.now(timezone.utc),
        detected_at=datetime.now(timezone.utc),
        ship_id=vessel_id,
        ship_name=vessel.get("name"),
        alert_type=alert_type,
        severity=severity,
        location=AlertLocation(latitude=lat, longitude=lon) if lat is not None and lon is not None else None,
        description=description,
        reasoning=reasoning,
        evidence=evidence,
        event_id=event_id,
    )
    db.ship_alerts.replace_one({"alert_id": alert_id}, alert.model_dump(mode="python"), upsert=True)
    return f"Alert {alert_id} saved ({AlertSeverity(severity).value} {AlertType(alert_type).value})"


@tool
def maritime_news_search(query: str) -> str:
    """Search recent maritime news (via Perplexity) for context on a vessel, region or incident."""
    try:
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers={"Authorization": f"Bearer {PERPLEXITY_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "sonar",
                "messages": [
                    {"role": "system", "content": "You are a maritime intelligence assistant. Give concise, factual, sourced answers."},
                    {"role": "user", "content": f"maritime shipping {query} latest news"},
                ],
                "search_domain_filter": ["maritime-executive.com", "tradewindsnews.com", "lloydslist.com",
                                         "seatrade-maritime.com", "marinelink.com"],
                "search_recency_filter": "month",
                "max_tokens": 800,
            },
            timeout=30,
        )
        response.raise_for_status()
        result = response.json()
        return json.dumps({"content": result["choices"][0]["message"]["content"],
                           "citations": result.get("citations", [])})
    except Exception as e:
        return json.dumps({"error": str(e)})


SYSTEM_PROMPT = """You are OceanWatch, a maritime intelligence analyst investigating vessels for illegal,
unreported and unregulated (IUU) fishing and other suspicious behaviour, using Global Fishing Watch data.

For the vessel you are given:
1. Call get_vessel_profile, then get_vessel_events to review its activity.
2. Look for genuinely suspicious patterns, for example:
   - AIS gaps (transponder off), especially long ones, ones flagged as likely intentional,
     or ones near protected areas or other vessels
   - Fishing or loitering inside no-take marine protected areas
   - Encounters at sea with other vessels (possible transshipment), especially on the high seas
     or with reefers/carriers
   - Loitering far from shore, or behaviour inconsistent with the vessel's stated type
3. Weigh context: vessel type and flag, location, duration, how often it repeats. Routine port
   visits by ferries or cargo ships are normal and should not be alerted.
4. For each distinct concern the evidence supports, call create_alert once, linked to the most
   representative event_id. Map concerns to alert types: AIS gaps -> gap_in_tracking,
   loitering -> loitering, at-sea meetings -> encounter, activity inside protected areas or
   illogical movements -> suspicious_route, unusual port behaviour -> port_entry or port_exit.
   Severity: critical only for strong, repeated evidence of likely illegal activity; high for
   clear risk; medium for notable but ambiguous; low for minor anomalies.
5. If nothing is suspicious, raise no alerts.

Finish with a two-sentence assessment of the vessel."""


def build_agent():
    llm = ChatOpenAI(model=OPENAI_MODEL, api_key=OPENAI_API_KEY, use_responses_api=True)
    tools = [get_vessel_profile, get_vessel_events, create_alert]
    if PERPLEXITY_API_KEY:
        tools.append(maritime_news_search)
    return create_agent(llm, tools, system_prompt=SYSTEM_PROMPT)


def pick_candidates(max_ships: int) -> List[Dict[str, Any]]:
    """Vessels worth an LLM's attention: risk counters first, then the most at-sea activity."""
    at_sea = {r["_id"]: r["n"] for r in db.gfw_ship_events.aggregate([
        {"$match": {"type": {"$in": ["gap", "encounter", "loitering"]}}},
        {"$group": {"_id": "$vessel_id", "n": {"$sum": 1}}},
    ])}
    vessels = list(db.vessel.find({"noEvents": False}, {"_id": 0, "vessel_id": 1, "name": 1, "aisOff_count": 1,
                                                         "eventsInNoTakeMpas_count": 1,
                                                         "eventsInRfmoWithoutKnownAuthorization_count": 1}))
    for v in vessels:
        v["risk"] = sum(v.get(k) or 0 for k in ("aisOff_count", "eventsInNoTakeMpas_count",
                                                 "eventsInRfmoWithoutKnownAuthorization_count"))
        v["at_sea"] = at_sea.get(v["vessel_id"], 0)
    vessels = [v for v in vessels if v["risk"] or v["at_sea"]]
    vessels.sort(key=lambda v: (v["risk"], v["at_sea"]), reverse=True)
    return vessels[:max_ships]


def scan(max_ships: int) -> None:
    agent = build_agent()
    candidates = pick_candidates(max_ships)
    print(f"OceanWatch agent ({OPENAI_MODEL}) scanning {len(candidates)} vessels in '{DB_NAME}'")
    before = db.ship_alerts.count_documents({})
    for i, v in enumerate(candidates, 1):
        started = time.time()
        try:
            result = agent.invoke({"messages": [{"role": "user", "content": f"Investigate vessel {v['vessel_id']} ({v.get('name')})."}]})
            final = result["messages"][-1]
            summary = final.text if hasattr(final, "text") else str(final.content)
            print(f"[{i}/{len(candidates)}] {v.get('name')} ({time.time() - started:.0f}s): {' '.join(str(summary).split())[:220]}")
        except Exception as e:
            print(f"[{i}/{len(candidates)}] {v.get('name')}: error {type(e).__name__}: {e}")
    print(f"Done. Alerts in database: {before} -> {db.ship_alerts.count_documents({})}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="OceanWatch ship monitor agent")
    parser.add_argument("--max-ships", type=int, default=25)
    parser.add_argument("--watch", type=int, metavar="MINUTES", help="rescan on this interval instead of exiting")
    args = parser.parse_args()
    while True:
        scan(args.max_ships)
        if not args.watch:
            break
        time.sleep(args.watch * 60)
