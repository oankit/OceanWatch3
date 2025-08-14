import { Service } from "@/lib/serviceRoot";
import { AxiosError } from "axios";

export interface AlertLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export interface Alert {
  alert_id: string;
  timestamp: string;
  ship_id: string;
  ship_name?: string;
  alert_type: 'loitering' | 'port_entry' | 'port_exit' | 'suspicious_route' | 'speed_anomaly' | 'encounter' | 'gap_in_tracking';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: AlertLocation;
  description: string;
  reasoning: string;
  evidence: string[];
  status: string;
}

export interface GetAlertsResponse {
  data: Alert[];
  total: number;
  offset: number;
  limit: number;
}

export interface GetAlertsQuery {
  hours?: number;
  severity?: string;
  alert_type?: string;
  ship_id?: string;
  limit?: number;
  offset?: number;
}

export interface AlertStats {
  total: number;
  by_severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  by_type: {
    loitering: number;
    port_entry: number;
    port_exit: number;
    suspicious_route: number;
    speed_anomaly: number;
    encounter: number;
    gap_in_tracking: number;
  };
  recent_alerts: Alert[];
}

export interface GetAlertStatsResponse {
  data: AlertStats;
}

class AlertService extends Service {
  constructor() {
    super("/");
  }

  async getAlerts(query: GetAlertsQuery = {}): Promise<GetAlertsResponse> {
    const config = this.applyHeaders({}, query, true);
    const exec = this.safeAxiosApply<GetAlertsResponse>(() =>
      this.instance.get<GetAlertsResponse>("/api/alerts", config)
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
    return res as GetAlertsResponse;
  }

  async getAlertStats(hours: number = 24): Promise<GetAlertStatsResponse> {
    const config = this.applyHeaders({}, { hours }, true);
    const exec = this.safeAxiosApply<GetAlertStatsResponse>(() =>
      this.instance.get<GetAlertStatsResponse>("/api/alerts/stats", config)
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
    return res as GetAlertStatsResponse;
  }

  async getRecentAlerts(hours: number = 6): Promise<Alert[]> {
    const response = await this.getAlerts({ hours, limit: 50 });
    return response.data;
  }

  async getAlertsByShip(ship_id: string, hours: number = 24): Promise<Alert[]> {
    const response = await this.getAlerts({ ship_id, hours, limit: 100 });
    return response.data;
  }

  async getHighPriorityAlerts(): Promise<Alert[]> {
    const response = await this.getAlerts({ 
      severity: 'high,critical', 
      hours: 24, 
      limit: 20 
    });
    return response.data;
  }
}

export const alertService = new AlertService();
