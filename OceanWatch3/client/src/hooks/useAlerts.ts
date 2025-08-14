import { useState, useEffect, useCallback } from 'react';
import { alertService, Alert, AlertStats } from '@/services/alertService';

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchAlerts = useCallback(async (hours: number = 6) => {
    try {
      setLoading(true);
      const [alertsData, statsData] = await Promise.all([
        alertService.getRecentAlerts(hours),
        alertService.getAlertStats(hours)
      ]);
      setAlerts(alertsData);
      setStats(statsData.data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAlertsByShip = useCallback(async (ship_id: string, hours: number = 24) => {
    try {
      const shipAlerts = await alertService.getAlertsByShip(ship_id, hours);
      return shipAlerts;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ship alerts');
      return [];
    }
  }, []);

  const fetchHighPriorityAlerts = useCallback(async () => {
    try {
      const highPriorityAlerts = await alertService.getHighPriorityAlerts();
      return highPriorityAlerts;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch high priority alerts');
      return [];
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Set up polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAlerts();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const getAlertsBySeverity = useCallback((severity: Alert['severity']) => {
    return alerts.filter(alert => alert.severity === severity);
  }, [alerts]);

  const getAlertsByType = useCallback((type: Alert['alert_type']) => {
    return alerts.filter(alert => alert.alert_type === type);
  }, [alerts]);

  const getAlertsByShip = useCallback((ship_id: string) => {
    return alerts.filter(alert => alert.ship_id === ship_id);
  }, [alerts]);

  const hasActiveAlerts = useCallback(() => {
    return alerts.some(alert => alert.status === 'active');
  }, [alerts]);

  const getCriticalAlerts = useCallback(() => {
    return alerts.filter(alert => alert.severity === 'critical' && alert.status === 'active');
  }, [alerts]);

  const getHighAlerts = useCallback(() => {
    return alerts.filter(alert => alert.severity === 'high' && alert.status === 'active');
  }, [alerts]);

  return {
    alerts,
    stats,
    loading,
    error,
    lastUpdate,
    fetchAlerts,
    fetchAlertsByShip,
    fetchHighPriorityAlerts,
    getAlertsBySeverity,
    getAlertsByType,
    getAlertsByShip,
    hasActiveAlerts,
    getCriticalAlerts,
    getHighAlerts,
    refresh: () => fetchAlerts(),
  };
}
