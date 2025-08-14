import { Badge } from '@/components/ui/badge';
import { AlertStats } from '@/services/alertService';

interface AlertFiltersProps {
  filters: {
    severity: string[];
    type: string[];
    showActiveOnly: boolean;
  };
  onFiltersChange: (filters: any) => void;
  stats: AlertStats | null;
}

const severityOptions = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-blue-500' },
];

const typeOptions = [
  { value: 'loitering', label: 'Loitering', icon: '🚢' },
  { value: 'port_entry', label: 'Port Entry', icon: '🏠' },
  { value: 'port_exit', label: 'Port Exit', icon: '🚪' },
  { value: 'suspicious_route', label: 'Suspicious Route', icon: '🛤️' },
  { value: 'speed_anomaly', label: 'Speed Anomaly', icon: '⚡' },
  { value: 'encounter', label: 'Encounter', icon: '🤝' },
  { value: 'gap_in_tracking', label: 'Tracking Gap', icon: '❓' },
];

export function AlertFilters({ filters, onFiltersChange, stats }: AlertFiltersProps) {
  const toggleSeverity = (severity: string) => {
    const newSeverities = filters.severity.includes(severity)
      ? filters.severity.filter(s => s !== severity)
      : [...filters.severity, severity];
    
    onFiltersChange({
      ...filters,
      severity: newSeverities,
    });
  };

  const toggleType = (type: string) => {
    const newTypes = filters.type.includes(type)
      ? filters.type.filter(t => t !== type)
      : [...filters.type, type];
    
    onFiltersChange({
      ...filters,
      type: newTypes,
    });
  };

  const toggleActiveOnly = () => {
    onFiltersChange({
      ...filters,
      showActiveOnly: !filters.showActiveOnly,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      severity: [],
      type: [],
      showActiveOnly: true,
    });
  };

  const getSeverityCount = (severity: string) => {
    if (!stats) return 0;
    return stats.by_severity[severity as keyof typeof stats.by_severity] || 0;
  };

  const getTypeCount = (type: string) => {
    if (!stats) return 0;
    return stats.by_type[type as keyof typeof stats.by_type] || 0;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Active Only Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-200">Show Active Only</label>
        <button
          onClick={toggleActiveOnly}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            filters.showActiveOnly ? 'bg-blue-600' : 'bg-zinc-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              filters.showActiveOnly ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Severity Filters */}
      <div>
        <h4 className="text-sm font-medium text-zinc-200 mb-2">Severity</h4>
        <div className="flex flex-wrap gap-2">
          {severityOptions.map((option) => {
            const count = getSeverityCount(option.value);
            const isSelected = filters.severity.includes(option.value);
            
            return (
              <button
                key={option.value}
                onClick={() => toggleSeverity(option.value)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  isSelected
                    ? 'bg-zinc-600 text-white'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${option.color}`} />
                <span>{option.label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Type Filters */}
      <div>
        <h4 className="text-sm font-medium text-zinc-200 mb-2">Alert Type</h4>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((option) => {
            const count = getTypeCount(option.value);
            const isSelected = filters.type.includes(option.value);
            
            return (
              <button
                key={option.value}
                onClick={() => toggleType(option.value)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  isSelected
                    ? 'bg-zinc-600 text-white'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear Filters */}
      {(filters.severity.length > 0 || filters.type.length > 0) && (
        <div className="pt-2 border-t border-zinc-600">
          <button
            onClick={clearFilters}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
