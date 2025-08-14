import { Alert, AlertStats, GetAlertsResponse, GetAlertStatsResponse, GetAlertsQuery } from './alertService';

// Mock ship data for generating alerts
const mockShips = [
  { id: 'SHIP001', name: 'Ocean Explorer' },
  { id: 'SHIP002', name: 'Maritime Star' },
  { id: 'SHIP003', name: 'Pacific Voyager' },
  { id: 'SHIP004', name: 'Atlantic Trader' },
  { id: 'SHIP005', name: 'Mediterranean Carrier' },
];

// Mock alert types with descriptions
const alertTypes = [
  {
    type: 'loitering' as const,
    descriptions: [
      'Vessel loitering in restricted fishing zone for 8+ hours',
      'Suspicious loitering near maritime boundary',
      'Extended loitering in high-traffic shipping lane',
      'Vessel stationary in EEZ for 12+ hours'
    ]
  },
  {
    type: 'suspicious_route' as const,
    descriptions: [
      'Vessel deviating from normal shipping routes',
      'Unusual route pattern detected near sensitive areas',
      'Vessel taking circuitous route avoiding normal checkpoints',
      'Route deviation from declared destination'
    ]
  },
  {
    type: 'speed_anomaly' as const,
    descriptions: [
      'Vessel traveling at unusually high speed for vessel type',
      'Sudden speed changes inconsistent with normal operations',
      'Vessel operating at speeds below minimum safe speed',
      'Erratic speed patterns detected'
    ]
  },
  {
    type: 'encounter' as const,
    descriptions: [
      'Close encounter with another vessel in restricted area',
      'Vessel rendezvous with unknown vessel at sea',
      'Suspicious vessel-to-vessel transfer detected',
      'Multiple vessels in close proximity in remote area'
    ]
  },
  {
    type: 'port_entry' as const,
    descriptions: [
      'Vessel entering port without proper authorization',
      'Entry into restricted port facility',
      'Vessel entering port during restricted hours',
      'Unauthorized port entry detected'
    ]
  },
  {
    type: 'port_exit' as const,
    descriptions: [
      'Vessel exiting port without clearance',
      'Departure during restricted hours',
      'Vessel leaving port without proper documentation',
      'Unauthorized port departure'
    ]
  },
  {
    type: 'gap_in_tracking' as const,
    descriptions: [
      'Extended gap in vessel tracking data',
      'Vessel AIS signal lost for 24+ hours',
      'Intermittent tracking data suggesting tampering',
      'Unexpected tracking blackout period'
    ]
  }
];

// Generate mock alerts
function generateMockAlerts(count: number = 10): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const ship = mockShips[Math.floor(Math.random() * mockShips.length)];
    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const severity = ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as Alert['severity'];
    
    // Generate random location (around world)
    const lat = (Math.random() - 0.5) * 180; // -90 to 90
    const lon = (Math.random() - 0.5) * 360; // -180 to 180
    
    // Generate timestamp within last 24 hours
    const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString();
    
    const alert: Alert = {
      alert_id: `ALERT${String(i + 1).padStart(3, '0')}`,
      timestamp,
      ship_id: ship.id,
      ship_name: ship.name,
      alert_type: alertType.type,
      severity,
      location: {
        latitude: lat,
        longitude: lon,
        timestamp,
        speed: Math.random() * 25 + 5, // 5-30 knots
        heading: Math.random() * 360
      },
      description: alertType.descriptions[Math.floor(Math.random() * alertType.descriptions.length)],
      reasoning: `AI analysis detected ${alertType.type.replace('_', ' ')} behavior based on vessel movement patterns, speed variations, and location data.`,
      evidence: [
        `Vessel track analysis shows ${alertType.type.replace('_', ' ')} pattern`,
        `Speed data indicates unusual behavior`,
        `Location data confirms suspicious activity`,
        `Historical pattern comparison reveals anomalies`
      ],
      status: Math.random() > 0.3 ? 'active' : 'resolved'
    };
    
    alerts.push(alert);
  }
  
  return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Generate mock stats
function generateMockStats(alerts: Alert[]): AlertStats {
  const by_severity = { low: 0, medium: 0, high: 0, critical: 0 };
  const by_type = {
    loitering: 0,
    port_entry: 0,
    port_exit: 0,
    suspicious_route: 0,
    speed_anomaly: 0,
    encounter: 0,
    gap_in_tracking: 0
  };
  
  alerts.forEach(alert => {
    by_severity[alert.severity]++;
    by_type[alert.alert_type]++;
  });
  
  return {
    total: alerts.length,
    by_severity,
    by_type,
    recent_alerts: alerts.slice(0, 5)
  };
}

class MockAlertService {
  private mockAlerts: Alert[] = [];
  private mockStats: AlertStats;

  constructor() {
    // Generate initial mock data
    this.mockAlerts = generateMockAlerts(15);
    this.mockStats = generateMockStats(this.mockAlerts);
  }

  async getAlerts(query: GetAlertsQuery = {}): Promise<GetAlertsResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    let filteredAlerts = [...this.mockAlerts];
    
    // Apply filters
    if (query.hours) {
      const cutoffTime = new Date(Date.now() - query.hours * 60 * 60 * 1000);
      filteredAlerts = filteredAlerts.filter(alert => 
        new Date(alert.timestamp) >= cutoffTime
      );
    }
    
    if (query.severity) {
      const severities = query.severity.split(',');
      filteredAlerts = filteredAlerts.filter(alert => 
        severities.includes(alert.severity)
      );
    }
    
    if (query.alert_type) {
      const types = query.alert_type.split(',');
      filteredAlerts = filteredAlerts.filter(alert => 
        types.includes(alert.alert_type)
      );
    }
    
    if (query.ship_id) {
      filteredAlerts = filteredAlerts.filter(alert => 
        alert.ship_id === query.ship_id
      );
    }
    
    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const paginatedAlerts = filteredAlerts.slice(offset, offset + limit);
    
    return {
      data: paginatedAlerts,
      total: filteredAlerts.length,
      offset,
      limit
    };
  }

  async getAlertStats(hours: number = 24): Promise<GetAlertStatsResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
    
    // Filter alerts by hours for stats
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentAlerts = this.mockAlerts.filter(alert => 
      new Date(alert.timestamp) >= cutoffTime
    );
    
    const stats = generateMockStats(recentAlerts);
    
    return {
      data: stats
    };
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

  // Method to add new mock alerts (for testing)
  addMockAlert(alert: Alert) {
    this.mockAlerts.unshift(alert);
    this.mockStats = generateMockStats(this.mockAlerts);
  }

  // Method to generate new random alerts
  generateNewAlerts(count: number = 3) {
    const newAlerts = generateMockAlerts(count);
    this.mockAlerts.unshift(...newAlerts);
    this.mockStats = generateMockStats(this.mockAlerts);
    return newAlerts;
  }
}

export const mockAlertService = new MockAlertService();
