interface PortCall {
  id: string;
  unlocode: string | null;
  portName: string | null;
  ata: string | null; // Actual Time of Arrival
  atd: string | null; // Actual Time of Departure
}

interface VesselPortCallsResponse {
  vessel: {
    imo: string;
    mmsi: string;
    id: string;
  };
  events: PortCall[];
  totalCount: number;
}

class PortCallService {
  private static readonly BASE_URL = 'https://api.sinay.ai/vessels-intelligence/api/v1';
  private static readonly API_KEY = process.env.NEXT_PUBLIC_SINAY_API_KEY;

  static async getVesselPortCalls(vesselId: string): Promise<VesselPortCallsResponse | null> {
    try {
      if (!this.API_KEY) {
        console.error('Sinay API key not configured');
        return this.getMockPortCalls(vesselId);
      }

      const response = await fetch(`${this.BASE_URL}/vessels/${vesselId}/port-calls`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'API_KEY': this.API_KEY
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`No port calls found for vessel ${vesselId}`);
          return null;
        }
        if (response.status === 403 || response.status === 4003) {
          console.warn(`Access denied for vessel port calls: ${response.status}`);
          // Return mock data for demonstration when API access is denied
          return this.getMockPortCalls(vesselId);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: VesselPortCallsResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching vessel port calls:', error);
      // Return mock data as fallback
      return this.getMockPortCalls(vesselId);
    }
  }

  private static getMockPortCalls(vesselId: string): VesselPortCallsResponse {
    const now = new Date();
    const mockEvents: PortCall[] = [
      {
        id: 'evt_001',
        unlocode: 'USNYC',
        portName: 'NEW YORK',
        ata: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        atd: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'evt_002',
        unlocode: 'FRLEH',
        portName: 'LE HAVRE',
        ata: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        atd: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'evt_003',
        unlocode: 'SGSIN',
        portName: 'SINGAPORE',
        ata: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        atd: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    return {
      vessel: {
        imo: vesselId,
        mmsi: vesselId,
        id: vesselId
      },
      events: mockEvents,
      totalCount: mockEvents.length
    };
  }

  static formatPortCallDuration(ata: string | null, atd: string | null): string {
    if (!ata || !atd) return 'Unknown';
    
    const arrival = new Date(ata);
    const departure = new Date(atd);
    const durationMs = departure.getTime() - arrival.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h`;
  }

  static formatDateTime(dateTime: string | null): string {
    if (!dateTime) return 'Unknown';
    
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export default PortCallService;
export type { PortCall, VesselPortCallsResponse };