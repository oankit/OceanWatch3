import { memo, useEffect, useRef } from 'react';
import mapboxgl, { Map as MapboxMap, Marker } from 'mapbox-gl';
import type { ShipPosition } from '@/services/shipService';
import { createRoot } from 'react-dom/client';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface ShipMarkersProps {
  map: MapboxMap | null;
  ships: ShipPosition[];
  onShipClick?: (ship: ShipPosition) => void;
}

export interface ShipMarkerProps {
  map: MapboxMap;
  ship: ShipPosition;
  onClick?: (ship: ShipPosition) => void;
}

const ShipMarker = memo(
  function ShipMarker({ map, ship, onClick }: ShipMarkerProps) {
    const markerRef = useRef<Marker | null>(null);
    const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const getShipColors = (alertLevel: string) => {
      switch (alertLevel) {
        case 'red':
          return { fill: '#ffffff', stroke: '#ff4444', strokeWidth: '1' };
        case 'orange':
          return { fill: '#ffffff', stroke: '#ff8800', strokeWidth: '1' };
        case 'yellow':
          return { fill: '#ffffff', stroke: '#ffdd00', strokeWidth: '1' };
        case 'blue':
        default:
          return { fill: '#ffffff', stroke: '#a0fefe', strokeWidth: '1' };
      }
    };

    const colors = getShipColors(ship.alertLevel);

    const arrowSize = 22;

    useEffect(() => {
      if (!map || !map.loaded()) return;

      if (!containerRef.current) {
        containerRef.current = document.createElement('div');
      }
      if (!rootRef.current) {
        rootRef.current = createRoot(containerRef.current);
      }

      const handleClick = () => onClick?.(ship);

      rootRef.current.render(
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={handleClick}
              title={ship.name || ship.id}
              style={{
                width: arrowSize,
                height: arrowSize,
                display: 'grid',
                placeItems: 'center',
                transform: `rotate(${ship.bearing}deg)`,
                transformOrigin: 'center',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                cursor: 'pointer',
              }}
            >
              <svg width={arrowSize * 0.8} height={arrowSize * 0.8} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M12 2 L20 20 L12 16 L4 20 Z" 
                  fill={colors.fill} 
                  stroke={colors.stroke} 
                  strokeWidth={colors.strokeWidth}
                />
              </svg>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="flex flex-col">
              <span className="font-pp-neue-mono">{ship.name || ship.id}</span>
              <span className="text-zinc-300">{ship.lat.toFixed(4)}, {ship.lon.toFixed(4)}</span>
              {ship.totalSuspiciousActivity > 0 && (
                <div className="mt-1 pt-1 border-t border-zinc-600">
                  <span className="text-yellow-400">
                    {ship.totalSuspiciousActivity} suspicious {ship.totalSuspiciousActivity === 1 ? 'event' : 'events'} detected
                  </span>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      );

      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ element: containerRef.current!, anchor: 'center' })
          .setLngLat([ship.lon, ship.lat])
          .addTo(map);
      } else {
        markerRef.current.setLngLat([ship.lon, ship.lat]);
      }

      return () => {
        markerRef.current?.remove();
        markerRef.current = null;
        const root = rootRef.current;
        rootRef.current = null;
        containerRef.current = null;
        if (root) {
          setTimeout(() => {
            try { root.unmount(); } catch {}
          }, 0);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, ship.id, ship.lat, ship.lon, ship.bearing, ship.name, ship.alertLevel, ship.totalSuspiciousActivity, onClick]);

    return null;
  },
  (prev, next) => {
    if (prev.map !== next.map) return false;
    if (prev.onClick !== next.onClick) return false;
    const a = prev.ship;
    const b = next.ship;
    return (
      a.id === b.id &&
      a.lat === b.lat &&
      a.lon === b.lon &&
      a.bearing === b.bearing &&
      a.name === b.name &&
      a.alertLevel === b.alertLevel &&
      a.totalSuspiciousActivity === b.totalSuspiciousActivity
    );
  }
);

export default function ShipMarkers({ map, ships, onShipClick }: ShipMarkersProps) {
  if (!map) return null;
  return (
    <>
      {ships.map((ship, index) => (
        <ShipMarker key={`${ship.id}-${index}`} map={map} ship={ship} onClick={onShipClick} />
      ))}
    </>
  );
}