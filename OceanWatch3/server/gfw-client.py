import os
import requests
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, AliasChoices, ConfigDict

API_KEY = os.environ.get(
    'GFW_API_KEY',
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtpZEtleSJ9.eyJkYXRhIjp7Im5hbWUiOiJGaXNoIiwidXNlcklkIjo0OTEwNywiYXBwbGljYXRpb25OYW1lIjoiRmlzaCIsImlkIjozMTAwLCJ0eXBlIjoidXNlci1hcHBsaWNhdGlvbiJ9LCJpYXQiOjE3NTQ3NjMwNjMsImV4cCI6MjA3MDEyMzA2MywiYXVkIjoiZ2Z3IiwiaXNzIjoiZ2Z3In0.Yi3IxK86joKwdCL9oL98KUmwC6f5ZliRLaCc8d5M1tbm4tZYu6zJAuJt6e8kg1jatXxXBOVcrLaGHFEZxGnWfjkqFtl5zlu-s0I_fEA23wFNGVrYmDR9T98SbbQJaria-B2C1odN-uDsOfWpy8JjRoCyJx4aVp8i59P52CaIF0QCNAztYGJkI2wA-U2ek5M6IqPfxkzV3U-dhVooZzmnrD5dVkPBcNBxT9J2vQrd0ad9oNf-6MO2EgDyTKKjNihW4WyBnr6yRAM7fkDdsKEJt-nrn4sz0sxpImVovVD9ZPXTvt5knOKl5VNz9mTJGoz7nFiNWyi4o3Kbg3B8yW45Rr84WwQpru1ETc2QTRVN26jBgmE5sLmt2ttUIsFweKuKLSefTD7RVFXKjxGOlG8npQ5Uyxhmz0kt9btEyJU6nQYI9GPHGzwzGpyXt08fQxjrJ5hyk0xSO2YZH1wakIRS3WH9BQTinfRFhYFzUTRn_Mh_UUejamO1YzdsuNV39zcv'
)

class Period(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    start_date: str = Field(..., validation_alias=AliasChoices("startDate", "start_date"))
    end_date: str = Field(..., validation_alias=AliasChoices("endDate", "end_date"))

class PeriodSelectedCounters(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    events: int
    events_in_rfmo_without_known_authorization: int = Field(..., validation_alias=AliasChoices("eventsInRFMOWithoutKnownAuthorization", "events_in_rfmo_without_known_authorization"))
    events_in_no_take_mpas: int = Field(..., validation_alias=AliasChoices("eventsInNoTakeMPAs", "events_in_no_take_mpas"))

class ApparentFishing(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    datasets: List[str]
    period_selected_counters: PeriodSelectedCounters = Field(..., validation_alias=AliasChoices("periodSelectedCounters", "period_selected_counters"))
    events_in_rfmo_without_known_authorization: List[Any] = Field(..., validation_alias=AliasChoices("eventsInRfmoWithoutKnownAuthorization", "events_in_rfmo_without_known_authorization"))
    events_in_no_take_mpas: List[str] = Field(..., validation_alias=AliasChoices("eventsInNoTakeMpas", "events_in_no_take_mpas"))

class GFWVesselInsightsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    period: Period
    vessel_ids_without_identity: Optional[Any] = Field(None, validation_alias=AliasChoices("vesselIdsWithoutIdentity", "vessel_ids_without_identity"))
    apparent_fishing: ApparentFishing = Field(..., validation_alias=AliasChoices("apparentFishing", "apparent_fishing"))

class Position(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    lat: float
    lon: float

class Regions(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    mpa: List[Any]
    eez: List[Any]
    rfmo: List[str]
    fao: List[str]
    major_fao: List[str] = Field(..., validation_alias=AliasChoices("majorFao", "major_fao"))
    eez_12nm: List[Any] = Field(..., validation_alias=AliasChoices("eez12Nm", "eez_12nm"))
    high_seas: List[Any] = Field(..., validation_alias=AliasChoices("highSeas", "high_seas"))
    mpa_no_take_partial: List[Any] = Field(..., validation_alias=AliasChoices("mpaNoTakePartial", "mpa_no_take_partial"))
    mpa_no_take: List[Any] = Field(..., validation_alias=AliasChoices("mpaNoTake", "mpa_no_take"))

class Distances(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    start_distance_from_shore_km: Optional[float] = Field(None, validation_alias=AliasChoices("startDistanceFromShoreKm", "start_distance_from_shore_km"))
    end_distance_from_shore_km: Optional[float] = Field(None, validation_alias=AliasChoices("endDistanceFromShoreKm", "end_distance_from_shore_km"))
    start_distance_from_port_km: Optional[float] = Field(None, validation_alias=AliasChoices("startDistanceFromPortKm", "start_distance_from_port_km"))
    end_distance_from_port_km: Optional[float] = Field(None, validation_alias=AliasChoices("endDistanceFromPortKm", "end_distance_from_port_km"))

class VesselNextPort(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[str]
    flag: Optional[str]
    name: Optional[str]
    port_visit_event_id: Optional[str] = Field(None, validation_alias=AliasChoices("portVisitEventId", "port_visit_event_id"))

class Vessel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    name: Optional[str]
    ssvid: Optional[str]
    flag: Optional[str]
    type: Optional[str]
    next_port: Optional[VesselNextPort] = Field(None, validation_alias=AliasChoices("nextPort", "next_port"))

class Gap(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    intentional_disabling: Optional[bool] = Field(None, validation_alias=AliasChoices("intentionalDisabling", "intentional_disabling"))
    distance_km: Optional[Union[float, str]] = Field(None, validation_alias=AliasChoices("distanceKm", "distance_km"))
    duration_hours: Optional[float] = Field(None, validation_alias=AliasChoices("durationHours", "duration_hours"))
    implied_speed_knots: Optional[Union[float, str]] = Field(None, validation_alias=AliasChoices("impliedSpeedKnots", "implied_speed_knots"))
    positions_12_hours_before_sat: Optional[Union[int, str]] = Field(None, validation_alias=AliasChoices("positions12HoursBeforeSat", "positions_12_hours_before_sat"))
    positions_per_day_sat_reception: Optional[float] = Field(None, validation_alias=AliasChoices("positionsPerDaySatReception", "positions_per_day_sat_reception"))
    off_position: Optional[Position] = Field(None, validation_alias=AliasChoices("offPosition", "off_position"))
    on_position: Optional[Dict[str, Union[float, str]]] = Field(None, validation_alias=AliasChoices("onPosition", "on_position"))

class Loitering(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    total_time_hours: Optional[float] = Field(None, validation_alias=AliasChoices("totalTimeHours", "total_time_hours"))
    total_distance_km: Optional[float] = Field(None, validation_alias=AliasChoices("totalDistanceKm", "total_distance_km"))
    average_speed_knots: Optional[float] = Field(None, validation_alias=AliasChoices("averageSpeedKnots", "average_speed_knots"))
    average_distance_from_shore_km: Optional[float] = Field(None, validation_alias=AliasChoices("averageDistanceFromShoreKm", "average_distance_from_shore_km"))

class GFWEventResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    start: str
    end: str
    id: str
    type: str
    position: Position
    regions: Regions
    bounding_box: List[float] = Field(..., validation_alias=AliasChoices("boundingBox", "bounding_box"))
    distances: Distances
    vessel: Vessel
    gap: Optional[Gap]
    loitering: Optional[Loitering]

# New models for the new endpoints

class GFWEventsMetadata(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    datasets: List[str]
    vessels: List[str]
    date_range: Dict[str, str] = Field(..., validation_alias=AliasChoices("dateRange", "date_range"))
    encounter_types: Optional[List[Any]] = Field(None, validation_alias=AliasChoices("encounterTypes", "encounter_types"))

class GFWEventsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    metadata: GFWEventsMetadata
    limit: int
    offset: int
    next_offset: Optional[int] = Field(None, validation_alias=AliasChoices("nextOffset", "next_offset"))
    total: int
    entries: List[Any]

class GFWVesselGearType(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str
    source: str
    year_from: int = Field(..., validation_alias=AliasChoices("yearFrom", "year_from"))
    year_to: int = Field(..., validation_alias=AliasChoices("yearTo", "year_to"))

class GFWVesselShipType(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str
    source: str
    year_from: int = Field(..., validation_alias=AliasChoices("yearFrom", "year_from"))
    year_to: int = Field(..., validation_alias=AliasChoices("yearTo", "year_to"))

class GFWVesselCombinedSourcesInfo(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    vessel_id: str = Field(..., validation_alias=AliasChoices("vesselId", "vessel_id"))
    geartypes: List[GFWVesselGearType]
    shiptypes: List[GFWVesselShipType]

class GFWVesselSelfReportedInfo(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    ssvid: Optional[str]
    shipname: Optional[str]
    n_shipname: Optional[str] = Field(None, validation_alias=AliasChoices("nShipname", "n_shipname"))
    flag: Optional[str]
    callsign: Optional[str]
    imo: Optional[Union[str, int, None]]
    messages_counter: Optional[int] = Field(None, validation_alias=AliasChoices("messagesCounter", "messages_counter"))
    positions_counter: Optional[int] = Field(None, validation_alias=AliasChoices("positionsCounter", "positions_counter"))
    source_code: Optional[List[str]] = Field(None, validation_alias=AliasChoices("sourceCode", "source_code"))
    match_fields: Optional[str] = Field(None, validation_alias=AliasChoices("matchFields", "match_fields"))
    transmission_date_from: Optional[str] = Field(None, validation_alias=AliasChoices("transmissionDateFrom", "transmission_date_from"))
    transmission_date_to: Optional[str] = Field(None, validation_alias=AliasChoices("transmissionDateTo", "transmission_date_to"))

class GFWVesselDetailsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    registry_info_total_records: Optional[int] = Field(None, validation_alias=AliasChoices("registryInfoTotalRecords", "registry_info_total_records"))
    registry_info: Optional[List[Any]] = Field(None, validation_alias=AliasChoices("registryInfo", "registry_info"))
    registry_owners: Optional[List[Any]] = Field(None, validation_alias=AliasChoices("registryOwners", "registry_owners"))
    registry_public_authorizations: Optional[List[Any]] = Field(None, validation_alias=AliasChoices("registryPublicAuthorizations", "registry_public_authorizations"))
    combined_sources_info: Optional[List[GFWVesselCombinedSourcesInfo]] = Field(None, validation_alias=AliasChoices("combinedSourcesInfo", "combined_sources_info"))
    self_reported_info: Optional[List[GFWVesselSelfReportedInfo]] = Field(None, validation_alias=AliasChoices("selfReportedInfo", "self_reported_info"))
    dataset: Optional[str]

class GFWClient:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def get_vessel_insights(
        self,
        vessel_id: str,
        dataset_id: str = "public-global-vessel-identity:latest",
        start_date: str = "2023-01-01",
        end_date: str = "2025-12-31",
        includes: Optional[List[str]] = None,
    ) -> GFWVesselInsightsResponse:
        """
        Calls the GFW Insights API for a single vessel and returns a pydantic-safe response.
        """
        url = "https://gateway.api.globalfishingwatch.org/v3/insights/vessels"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "includes": includes or ["FISHING"],
            "startDate": start_date,
            "endDate": end_date,
            "vessels": [
                {"datasetId": dataset_id, "vesselId": vessel_id}
            ]
        }
        resp = requests.post(url, headers=headers, json=payload)
        return resp.json().get('apparentFishing')

    def get_vessel_details(
        self,
        vessel_id: str,
        dataset: str = "public-global-vessel-identity:latest"
    ) -> GFWVesselDetailsResponse:
        """
        Calls the GFW Vessels API for a single vessel and returns a pydantic-safe response.
        """
        url = f"https://gateway.api.globalfishingwatch.org/v3/vessels/{vessel_id}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }
        params = {
            "dataset": dataset
        }
        resp = requests.get(url, headers=headers, params=params)
        resp.raise_for_status()
        return GFWVesselDetailsResponse.model_validate(resp.json())

    def get_event(
        self,
        event_id: str,
        dataset: str = "public-global-gaps-events:latest"
    ) -> GFWEventResponse:
        """
        Calls the GFW Events API for a single event and returns a pydantic-safe response.
        """
        url = f"https://gateway.api.globalfishingwatch.org/v3/events/{event_id}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
        }
        params = {
            "dataset": dataset
        }
        resp = requests.get(url, headers=headers, params=params)
        resp.raise_for_status()
        return GFWEventResponse.model_validate(resp.json())

    def post_events(
        self,
        vessel_ids: List[str],
        datasets: List[str],
        start_date: str = "2023-01-01",
        end_date: str = "2025-12-31",
        limit: int = 50,
        offset: int = 0,
    ) -> GFWEventsResponse:
        """
        Calls the GFW Events API using POST (for loitering and other event types) and returns a pydantic-safe response.
        """
        url = f"https://gateway.api.globalfishingwatch.org/v3/events?offset={offset}&limit={limit}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "datasets": datasets,
            "startDate": start_date,
            "endDate": end_date,
            "vessels": vessel_ids
        }
        resp = requests.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        return GFWEventsResponse.model_validate(resp.json())

from typing import Tuple
import csv

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


if __name__ == "__main__":
    client = GFWClient(API_KEY)
    vessels = read_vessels_from_csv('/home/johnliu/workspace/OceanWatch/server/data/test-data/vessels.csv')
    for vessel_id, name in vessels:
        resp = client.get_vessel_insights(vessel_id)
        print(resp)