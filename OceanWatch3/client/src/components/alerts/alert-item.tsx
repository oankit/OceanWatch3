import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, MapPin, Ship, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/services/alertService';
import { AnimatePresence } from 'framer-motion';

interface AlertItemProps {
  alert: Alert;
  onClick: () => void;
}

const severityColors = {
  critical: 'bg-red-500/20 border-red-500/50 text-red-400',
  high: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
  medium: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  low: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
};

const alertTypeIcons = {
  loitering: '🚢',
  port_entry: '🏠',
  port_exit: '🚪',
  suspicious_route: '🛤️',
  speed_anomaly: '⚡',
  encounter: '🤝',
  gap_in_tracking: '❓',
};

const alertTypeLabels = {
  loitering: 'Loitering',
  port_entry: 'Port Entry',
  port_exit: 'Port Exit',
  suspicious_route: 'Suspicious Route',
  speed_anomaly: 'Speed Anomaly',
  encounter: 'Encounter',
  gap_in_tracking: 'Tracking Gap',
};

export function AlertItem({ alert, onClick }: AlertItemProps) {
  const [expanded, setExpanded] = useState(false);
  const timestamp = new Date(alert.timestamp);

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <motion.div
      className={`mb-2 rounded-lg border p-3 cursor-pointer transition-all hover:bg-zinc-800/50 ${
        severityColors[alert.severity]
      }`}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{alertTypeIcons[alert.alert_type]}</span>
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-white">
              {alertTypeLabels[alert.alert_type]}
            </h3>
            <p className="text-xs text-zinc-300">
              {alert.ship_name || alert.ship_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={`text-xs ${
              alert.severity === 'critical' ? 'border-red-500 text-red-400' :
              alert.severity === 'high' ? 'border-orange-500 text-orange-400' :
              alert.severity === 'medium' ? 'border-yellow-500 text-yellow-400' :
              'border-blue-500 text-blue-400'
            }`}
          >
            {alert.severity.toUpperCase()}
          </Badge>
          <button
            onClick={toggleExpanded}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-200 mb-2 line-clamp-2">
        {alert.description}
      </p>

      {/* Timestamp */}
      <div className="flex items-center gap-1 text-xs text-zinc-400 mb-2">
        <Clock className="w-3 h-3" />
        <span>{timestamp.toLocaleString()}</span>
      </div>

      {/* Location */}
      {alert.location && (
        <div className="flex items-center gap-1 text-xs text-zinc-400 mb-2">
          <MapPin className="w-3 h-3" />
          <span>
            {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
          </span>
        </div>
      )}

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-zinc-600/50"
          >
            {/* Reasoning */}
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-zinc-300 mb-1">Reasoning</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {alert.reasoning}
              </p>
            </div>

            {/* Evidence */}
            {alert.evidence.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-zinc-300 mb-1">Evidence</h4>
                <ul className="text-xs text-zinc-400 space-y-1">
                  {alert.evidence.map((evidence, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-zinc-500 mt-1">•</span>
                      <span>{evidence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Status: {alert.status}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <Ship className="w-3 h-3" />
                <span>ID: {alert.ship_id}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
