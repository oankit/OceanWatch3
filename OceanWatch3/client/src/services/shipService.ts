import { Service } from "@/lib/serviceRoot";
import { TrackPoint } from "@/pages/api/get-ship-track";
import { GetVesselDataResponse } from "@/pages/api/get-vessel-data";
import { GetRiskZonesResponse } from "@/pages/api/get-risk-zones";
import { AxiosError } from "axios";

export interface VesselData {
  id: string;
  name: string;
  ssvid: string;
  flag: string;
  type: string;
  nextPort: string | null;
}

export type GetShipTrackResponse = {
  id: string;
  points: TrackPoint[];
};

export interface Ship {
  _id?: string;
  vessel_id: string;
  name?: string;
  insights?: unknown;
  details?: unknown;
  events_count?: number;
  events_counts_by_dataset?: Record<string, number>;
  updated_at?: string;
  events?: unknown[];
}

export interface GetShipsResponse {
  data: Ship[];
  total: number;
  offset: number;
  limit: number;
}

export interface GetShipsQuery {
  q?: string;
  limit?: number;
  offset?: number;
}

export interface ShipPosition {
  id: string;
  name?: string;
  lat: number;
  lon: number;
  bearing: number;
  alertLevel: 'blue' | 'yellow' | 'orange' | 'red';
  // Individual counts
  aisOffCount: number;
  eventsInNoTakeMpasCount: number;
  eventsInRfmoWithoutKnownAuthorizationCount: number;
  totalTimesListedCount: number;
  // Total suspicious activity for alert calculation
  totalSuspiciousActivity: number;
  // Full vessel data
  vessel: any;
}

export type GetShipPositionsResponse = { data: ShipPosition[] };

class ShipService extends Service {
  constructor() {
    super("/");
  }

  async getShipPositions(): Promise<GetShipPositionsResponse> {
    const exec = this.safeAxiosApply<GetShipPositionsResponse, any>(() =>
      this.instance.get<GetShipPositionsResponse>("/api/get-ship-positions")
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
    return res as GetShipPositionsResponse;
  }

  async getShipTrack(id: string): Promise<GetShipTrackResponse> {
    const config = this.applyHeaders({}, { id }, true);
    const exec = this.safeAxiosApply<GetShipTrackResponse, any>(() =>
      this.instance.get<GetShipTrackResponse>(`/api/get-ship-track`, config)
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
    return res as GetShipTrackResponse;
  }

  async getVesselData(id: string): Promise<GetVesselDataResponse> {
    const config = this.applyHeaders({}, { id }, true);
    const exec = this.safeAxiosApply<GetVesselDataResponse, any>(() =>
      this.instance.get<GetVesselDataResponse>(`/api/get-vessel-data`, config)
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
    return res as GetVesselDataResponse;
  }

  async getRiskZones(): Promise<GetRiskZonesResponse> {
    const exec = this.safeAxiosApply<GetRiskZonesResponse, any>(() =>
      this.instance.get<GetRiskZonesResponse>("/api/get-risk-zones")
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
    return res as GetRiskZonesResponse;
  }
}

export const shipService = new ShipService();