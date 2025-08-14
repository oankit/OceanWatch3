import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bell, Clock, Eye, EyeOff, Filter, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertStats } from '@/services/alertService';
import { AlertItem } from './alert-item';
import { AlertFilters } from './alert-filters';

interface AlertPanelProps {
  alerts: Alert[];
  stats: AlertStats | null;
  loading: boolean;
  lastUpdate: Date;
  onRefresh: () => void;
  onAlertClick: (alert: Alert) => void;
}

export function AlertPanel({ 
  alerts, 
  stats, 
  loading, 
  lastUpdate, 
  onRefresh, 
  onAlertClick 
}: AlertPanelProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    severity: [] as string[],
    type: [] as string[],
    showActiveOnly: true,
  });

  const filteredAlerts = alerts.filter(alert => {
    if (filters.showActiveOnly && alert.status !== 'active') return false;
    if (filters.severity.length > 0 && !filters.severity.includes(alert.severity)) return false;
    if (filters.type.length > 0 && !filters.type.includes(alert.alert_type)) return false;
    return true;
  });

  const criticalCount = stats?.by_severity.critical || 0;
  const highCount = stats?.by_severity.high || 0;
  const totalActive = filteredAlerts.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Alerts</h2>
          {totalActive > 0 && (
            <Badge variant="destructive" className="ml-2">
              {totalActive}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="text-zinc-400 hover:text-white"
          >
            {showFilters ? <EyeOff className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            className="text-zinc-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="p-4 border-b border-zinc-700 bg-zinc-800/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {criticalCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-red-400">{criticalCount} Critical</span>
                </div>
              )}
              {highCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span className="text-orange-400">{highCount} High</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-zinc-400">
              <Clock className="w-3 h-3" />
              <span className="text-xs">
                {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-zinc-700"
          >
            <AlertFilters
              filters={filters}
              onFiltersChange={setFilters}
              stats={stats}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-400">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p className="text-sm">No alerts found</p>
            <p className="text-xs">All clear for now</p>
          </div>
        ) : (
          <div className="p-2">
            <AnimatePresence>
              {filteredAlerts.map((alert) => (
                <motion.div
                  key={alert.alert_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <AlertItem
                    alert={alert}
                    onClick={() => onAlertClick(alert)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
