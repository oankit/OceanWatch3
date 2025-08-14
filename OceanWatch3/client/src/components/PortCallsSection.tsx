import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Calendar, Ship } from 'lucide-react';
import PortCallService, { type PortCall, type VesselPortCallsResponse } from '../services/portCallService';

interface PortCallsSectionProps {
  vesselId: string;
  vesselName?: string;
}

const PortCallsSection: React.FC<PortCallsSectionProps> = ({ vesselId, vesselName }) => {
  const [portCalls, setPortCalls] = useState<VesselPortCallsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  useEffect(() => {
    const fetchPortCalls = async () => {
      setLoading(true);
      
      try {
        const data = await PortCallService.getVesselPortCalls(vesselId);
        setPortCalls(data);
        // Check if we're using mock data (mock data has predictable event IDs)
        setIsUsingMockData(data?.events.some(event => event.id.startsWith('evt_')) || false);
      } catch (err) {
        console.error('Error fetching port calls:', err);
        setPortCalls(null);
      } finally {
        setLoading(false);
      }
    };

    if (vesselId) {
      fetchPortCalls();
    }
  }, [vesselId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Ship className="w-5 h-5" />
          Port Calls
        </h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!portCalls || portCalls.events.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Ship className="w-5 h-5" />
          Port Calls
        </h3>
        <div className="text-gray-400 text-sm">No port calls data available</div>
      </div>
    );
  }

  const displayedEvents = showAll ? portCalls.events : portCalls.events.slice(0, 5);
  const hasMore = portCalls.events.length > 5;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Ship className="w-5 h-5" />
          Port Calls
          {isUsingMockData && (
            <span className="text-xs bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded">
              Demo Data
            </span>
          )}
        </h3>
        <span className="text-xs text-gray-400">
          {portCalls.totalCount} total
        </span>
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {displayedEvents.map((portCall) => (
          <PortCallCard key={portCall.id} portCall={portCall} />
        ))}
      </div>
      
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
        >
          {showAll ? 'Show Less' : `Show All (${portCalls.events.length})`}
        </button>
      )}
    </div>
  );
};

const PortCallCard: React.FC<{ portCall: PortCall }> = ({ portCall }) => {
  const duration = PortCallService.formatPortCallDuration(portCall.ata, portCall.atd);
  const arrivalTime = PortCallService.formatDateTime(portCall.ata);
  const departureTime = PortCallService.formatDateTime(portCall.atd);

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <div>
            <div className="text-white font-medium text-sm">
              {portCall.portName || 'Unknown Port'}
            </div>
            {portCall.unlocode && (
              <div className="text-gray-400 text-xs">
                {portCall.unlocode}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Clock className="w-3 h-3" />
          {duration}
        </div>
      </div>
      
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2 text-gray-300">
          <Calendar className="w-3 h-3 text-green-400" />
          <span className="text-green-400">Arrival:</span>
          <span>{arrivalTime}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <Calendar className="w-3 h-3 text-red-400" />
          <span className="text-red-400">Departure:</span>
          <span>{departureTime}</span>
        </div>
      </div>
    </div>
  );
};

export default PortCallsSection;