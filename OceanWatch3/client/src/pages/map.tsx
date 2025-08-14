import ShipMarkers from '@/components/map/ship-marker';
import RiskOverlay from '@/components/map/risk-overlay';
import TrackHistogram from '@/components/map/track-histogram';
import ActivityHistogram from '@/components/map/activity-histogram';
import SuspiciousActivityChart from '@/components/map/suspicious-activity-chart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useShips } from '@/hooks/useShips';
import { alpha3ToFlagEmoji } from '@/lib/flags';
import geocodingService from '@/services/geocodingService';
import { shipService, VesselData } from '@/services/shipService';
import { TrackPoint } from '@/pages/api/get-ship-track';
import { RiskHeatPoint } from '@/pages/api/get-risk-zones';
import * as turf from '@turf/turf';
import { AnimatePresence, motion } from 'framer-motion';
import { useAlerts } from '@/hooks/useAlerts';
import { useChat } from '@/hooks/useChat';
import { Box, Construction, Fish, Fuel, Ship, ShipWheel, User, X, Bell, AlertTriangle, MessageCircle } from 'lucide-react';
import mapboxgl, { Map as MapboxMap, Marker } from 'mapbox-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertPanel } from '@/components/alerts/alert-panel';
import { Alert } from '@/services/alertService';
import { ChatOverlay } from '@/components/chat/chat-overlay';
import PortCallsSection from '@/components/PortCallsSection';

mapboxgl.accessToken = 'pk.eyJ1Ijoia2FpbWFyc2hsYW5kIiwiYSI6ImNqb205dDhvczA0dDEzcm81Y2ljdnY0dWMifQ.HK_10izvkRBM8bQsXEc0PQ';

export default function Map() {
  const mapRef = useRef<MapboxMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const { ships, selectedShip, setSelectedShip } = useShips();
  const { alerts, stats, loading: alertsLoading, lastUpdate, refresh: refreshAlerts } = useAlerts();
  
  // Add chat hook with auto-start
  const {
    isConnected,
    isStartingServer,
    serverStatus,
    error: chatError
  } = useChat();
  
  const [selectedShipDataLoading, setSelectedShipDataLoading] = useState(false);
  const [selectedShipGeolocation, setSelectedShipGeolocation] = useState<string | null>(null)
  const [selectedShipTrack, setSelectedShipTrack] = useState<TrackPoint[]>([]);
  const [selectedShipVesselData, setSelectedShipVesselData] = useState<VesselData | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [riskZones, setRiskZones] = useState<RiskHeatPoint[]>([]);
  const [riskZonesLoading, setRiskZonesLoading] = useState(false);
  const pointMarkersRef = useRef<Marker[]>([]);

  useEffect(() => {
    let ignore = false;
    if (!selectedShip) {
      setSelectedShipTrack([]);
      setSelectedShipVesselData(null);
      setSelectedShipDataLoading(false);
      setSelectedShipGeolocation(null);
      return;
    }

    const fetchShipData = async () => {
      const [trackRes, vesselRes] = await Promise.all([
        shipService.getShipTrack(selectedShip),
        shipService.getVesselData(selectedShip),
      ]);
      if (trackRes.points.length > 0 && !ignore) {
        const lastPoint = trackRes.points[trackRes.points.length - 1];
        const geolocationRes = await geocodingService.getLandInfo(lastPoint.lat, lastPoint.lon);
        setSelectedShipGeolocation(geolocationRes.name || null);
      }
      if (!ignore) {
        setSelectedShipTrack(trackRes.points || []);
        setSelectedShipVesselData(vesselRes.data || null);
        setSelectedShipDataLoading(false);
      }
    }
    fetchShipData();
    return () => { ignore = true; };
  }, [selectedShip]);

  // Fetch risk zones independently when map is ready
  useEffect(() => {
    if (!mapReady) return;
    
    let ignore = false;
    const fetchRiskZones = async () => {
      try {
        setRiskZonesLoading(true);
        const data = await shipService.getRiskZones();
        if (!ignore) {
          if (data.heatPoints) {
            setRiskZones(data.heatPoints);
          }
        }
      } catch (error) {
        console.error('Failed to fetch risk zones:', error);
      } finally {
        if (!ignore) {
          setRiskZonesLoading(false);
        }
      }
    };

    // Add small delay to ensure ships load first
    setTimeout(fetchRiskZones, 1000);
    return () => { ignore = true; };
  }, [mapReady]);

  // Add effect to show chat status in console for debugging
  useEffect(() => {
    if (isStartingServer) {
      console.log('🚀 Starting RAG chatbot server...');
    } else if (isConnected) {
      console.log('✅ RAG chatbot connected and ready');
    } else if (serverStatus.error) {
      console.log('❌ RAG chatbot error:', serverStatus.error);
    }
  }, [isConnected, isStartingServer, serverStatus.error]);

  // Render selected ship track
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!(map as any).style || typeof (map as any).getStyle !== 'function') return;

    pointMarkersRef.current.forEach((m) => m.remove());
    pointMarkersRef.current = [];

    const removeLayerSafe = (id: string) => {
      try { if (map.getLayer(id)) map.removeLayer(id); } catch {}
    };
    const removeSourceSafe = (id: string) => {
      try { if (map.getSource(id)) map.removeSource(id); } catch {}
    };

    removeLayerSafe('selected-ship-track');
    removeSourceSafe('selected-ship-track');

    removeLayerSafe('uncertainty-area-stripes');
    removeLayerSafe('uncertainty-area-fill');
    removeSourceSafe('uncertainty-area');

    removeLayerSafe('selected-ship-track-points');
    removeSourceSafe('selected-ship-track-points');

    if (selectedShipTrack.length > 0) {
      try {
        const radiusKm = 200;
        const points = selectedShipTrack.map((pt) => 
          turf.point([pt.lon, pt.lat])
        );
        
        let finalShape: turf.AllGeoJSON | null = null;
        
        if (points.length === 1) {
          // Single point - just create a circle
          finalShape = turf.buffer(points[0], radiusKm, { units: 'kilometers' }) as turf.AllGeoJSON;
        } else if (points.length >= 3) {
          try {
            // Create points collection
            const pointCollection = turf.featureCollection(points);
            
            // Try concave hull first (more organic shape)
            let hull;
            try {
              hull = turf.concave(pointCollection, { maxEdge: 500, units: 'kilometers' });
            } catch {
              // Fallback to convex hull if concave fails
              hull = turf.convex(pointCollection);
            }
            
            if (hull) {
              // Create the cone of uncertainty by buffering the hull
              let uncertaintyArea = turf.buffer(hull, radiusKm, { units: 'kilometers' }) as any;
              
              // Apply smoothing for organic edges
              uncertaintyArea = turf.buffer(uncertaintyArea, -10, { units: 'kilometers' }) as any;
              uncertaintyArea = turf.buffer(uncertaintyArea, 15, { units: 'kilometers' }) as any;
              uncertaintyArea = turf.simplify(uncertaintyArea, { tolerance: 0.002, highQuality: true });
              
              finalShape = uncertaintyArea;
            }
          } catch (e) {
            console.error('Hull creation failed:', e);
            // Fallback to buffering all points individually and union
            const buffers = points.map(pt => turf.buffer(pt, radiusKm, { units: 'kilometers' }));
            finalShape = buffers[0] as turf.AllGeoJSON;
            
            for (let i = 1; i < buffers.length; i++) {
              try {
                finalShape = turf.union(finalShape as any, buffers[i] as any) as turf.AllGeoJSON;
              } catch {
                continue; // Skip failed unions
              }
            }
          }
        } else {
          // Two points - create line and buffer it
          const line = turf.lineString([points[0].geometry.coordinates, points[1].geometry.coordinates]);
          finalShape = turf.buffer(line, radiusKm, { units: 'kilometers' }) as turf.AllGeoJSON;
        }

        if (finalShape) {
          // Add pattern image once
          if (!map.hasImage('stripe-pattern')) {
            const size = 8;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, size, size);
              ctx.strokeStyle = 'rgba(113,113,122,0.6)'; // zinc-500 @60%
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(size, size);
              ctx.stroke();
              const imageData = ctx.getImageData(0, 0, size, size);
              try { map.addImage('stripe-pattern', imageData, { pixelRatio: 2 }); } catch {}
            }
          }

          map.addSource('uncertainty-area', {
            type: 'geojson',
            data: finalShape as any,
          });

          // Base translucent fill
          map.addLayer({
            id: 'uncertainty-area-fill',
            type: 'fill',
            source: 'uncertainty-area',
            paint: {
              'fill-color': '#f0ffff',
              'fill-opacity': 0.2,
            },
          });

          // Striped overlay
          map.addLayer({
            id: 'uncertainty-area-stripes',
            type: 'fill',
            source: 'uncertainty-area',
            paint: {
              'fill-pattern': 'stripe-pattern',
              'fill-opacity': 0.25,
            },
          });
        }
      } catch {}
    }

    if (selectedShipTrack.length > 1) {
      const lineGeojson: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: selectedShipTrack.map((pt) => [pt.lon, pt.lat] as [number, number]),
            },
          },
        ],
      };

      map.addSource('selected-ship-track', {
        type: 'geojson',
        data: lineGeojson,
      });
      map.addLayer({
        id: 'selected-ship-track',
        type: 'line',
        source: 'selected-ship-track',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#f0ffff',
          'line-width': 1,
        },
      });

      const pointsGeojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: 'FeatureCollection',
        features: selectedShipTrack.map((pt) => ({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [pt.lon, pt.lat],
          },
        })),
      };

      map.addSource('selected-ship-track-points', {
        type: 'geojson',
        data: pointsGeojson,
      });

      map.addLayer({
        id: 'selected-ship-track-points',
        type: 'circle',
        source: 'selected-ship-track-points',
        paint: {
          'circle-radius': 3,
          'circle-color': '#f0ffff',
          'circle-opacity': 0.9,
        },
      });
    }

    return () => {
      if (!map) return;
      // Guard against style not yet available
      if (!(map as any).style || typeof (map as any).getStyle !== 'function') return;
      pointMarkersRef.current.forEach((m) => m.remove());
      pointMarkersRef.current = [];
      const removeLayerSafe = (id: string) => { try { if (map.getLayer(id)) map.removeLayer(id); } catch {} };
      const removeSourceSafe = (id: string) => { try { if (map.getSource(id)) map.removeSource(id); } catch {} };

      removeLayerSafe('selected-ship-track');
      removeSourceSafe('selected-ship-track');
      removeLayerSafe('uncertainty-area-stripes');
      removeLayerSafe('uncertainty-area-fill');
      removeSourceSafe('uncertainty-area');
      removeLayerSafe('selected-ship-track-points');
      removeSourceSafe('selected-ship-track-points');
    };
  }, [selectedShipTrack, mapReady]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/omarankit2001/cmebb1taj00r801pg7rj1h7a9',
      center: [-74.0060, 40.7128],
      zoom: 3,
    });

    const onLoad = () => setMapReady(true);
    map.on('load', onLoad);

    mapRef.current = map;

    return () => {
      map.off('load', onLoad);
      setMapReady(false);
      map.remove();
    };
  }, []);

  const selected = useMemo(() => ships.find(s => s.id === selectedShip), [ships, selectedShip]);

  const handleShipClick = useCallback((s: { id: string }) => {
    setSelectedShip(s.id);
    setSelectedShipTrack([]);
    setSelectedShipVesselData(null);
    setSelectedShipDataLoading(true);
    setSelectedShipGeolocation(null);
  }, [setSelectedShip]);

  const handleAlertClick = useCallback((alert: Alert) => {
    const ship = ships.find(s => s.id === alert.ship_id);
    if (ship) {
      setSelectedShip(ship.id);
      setSelectedShipTrack([]);
      setSelectedShipVesselData(null);
      setSelectedShipDataLoading(true);
    }
  }, [ships, setSelectedShip]);

  const vesselTypeData = useCallback(() => {
    switch (selectedShipVesselData?.type) {
      case 'passenger': {
        return {
          title: 'Passenger',
          icon: <User className="size-4" />,
          color: '#804050'
        }
      }
      case 'bunker': {
        return {
          title: 'Bunker',
          icon: <Fuel className="size-4" />,
          color: '#707050'
        }
      }
      case 'cargo': {
        return {
          title: 'Cargo',
          icon: <Box className="size-4" />,
          color: '#805040'
        }
      }
      case 'fishing': {
        return {
          title: 'Fishing',
          icon: <Fish className="size-4" />,
          color: '#304090'
        }
      }
      case 'gear': {
        return {
          title: 'Gear',
          icon: <Construction className="size-4" />,
          color: '#408050'
        }
      }
      default: {
        return {
          title: 'Other',
          icon: <ShipWheel className="size-4" />,
          color: '#505050'
        }
      }
    }
  }, [selectedShipVesselData?.type]);

  const flagEmoji = alpha3ToFlagEmoji(selectedShipVesselData?.flag);

  return (
    <TooltipProvider>
      <div className="w-screen h-screen relative">
        <div className="w-80 absolute left-6 inset-y-6 bg-zinc-400/35 backdrop-blur-md rounded border border-zinc-500/50 text-zinc-50 z-20 flex flex-col">
          <nav className="w-full p-4 border-b border-zinc-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Ship className="size-5" />
                <div className="flex flex-col shrink-0">
                  <h1 className="text-base font-pp-neue-mono">OceanWatch</h1>
                  <p className="text-xs -mt-1">Maritime Intelligence</p>
                </div>
              </div>
                               <div className="flex items-center gap-2">
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={() => setShowChat(!showChat)}
                     className="text-zinc-300 hover:text-white"
                   >
                     <MessageCircle className="w-5 h-5" />
                   </Button>
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={() => setShowAlerts(!showAlerts)}
                     className="text-zinc-300 hover:text-white relative"
                   >
                     <Bell className="w-5 h-5" />
                     {stats && (stats.by_severity.critical + stats.by_severity.high) > 0 && (
                       <Badge
                         variant="destructive"
                         className="absolute -top-1 -right-1 w-4 h-4 text-xs p-0 flex items-center justify-center"
                       >
                         {stats.by_severity.critical + stats.by_severity.high}
                       </Badge>
                     )}
                   </Button>
                 </div>
            </div>
          </nav>

          {showAlerts && (
            <div className="flex-1 overflow-hidden">
              <AlertPanel
                alerts={alerts}
                stats={stats}
                loading={alertsLoading}
                lastUpdate={lastUpdate}
                onRefresh={refreshAlerts}
                onAlertClick={handleAlertClick}
              />
            </div>
          )}
        </div>
        <div className="w-screen h-screen">
          <div className="relative h-full overflow-hidden">
            <div className="h-full" ref={mapContainerRef} />
            {mapReady && (
              <>
                <RiskOverlay 
                  map={mapRef.current}
                  heatPoints={riskZones}
                  mapReady={mapReady}
                />
                <ShipMarkers
                  map={mapRef.current}
                  ships={ships}
                  onShipClick={handleShipClick}
                />
              </>
            )}
            <AnimatePresence>
              {selected && (
                <motion.aside
                  key={selected.id}
                  className="absolute top-6 right-6 rounded border border-zinc-500/50 h-auto w-80 bg-zinc-400/35 backdrop-blur-md p-4 text-zinc-50 z-30"
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "tween", duration: 0.25 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedShip(null)}
                    className="absolute right-0 top-0 text-zinc-300 hover:text-white hover:bg-transparent"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                  <div className="flex flex-col gap-4">
                    <section>
                      <h2 className="text-lg font-semibold truncate font-pp-neue-mono flex items-center">
                        {selectedShipDataLoading ? (
                          <Skeleton className="size-5 mr-2" />
                        ) : (
                          flagEmoji && (
                          <span
                            className="mr-2 text-sm"
                            aria-label="Flag"
                            title={selectedShipVesselData?.flag || ""}
                          >
                            {flagEmoji}
                          </span>
                          )
                        )}
                        <span className="text-lg font-semibold truncate font-pp-neue-mono">{selected?.name || "[Unknown Vessel]"}</span>
                      </h2>
                      {selectedShipDataLoading ? (
                        <Skeleton className="h-3 w-28" />
                      ) : (
                        <>
                          <p className="text-xs text-zinc-200">{selectedShipGeolocation}</p>
                        </>
                      )}
                      <p className="text-xs text-zinc-200">{selected.id}</p>
                    </section>
                    
                    {selectedShipDataLoading ? (
                      <>
                        <section className="flex items-center gap-2">
                          <Skeleton className="h-6 w-8" />
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </section>
                        <section className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-16 w-full" />
                        </section>
                        <section className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-16 w-full" />
                        </section>
                        {/* Suspicious activity skeleton - conditional */}
                        <section className="space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-16 w-full" />
                        </section>
                      </>
                    ) : (
                      <>
                        <section className="flex items-center gap-2">
                          <p className="text-xs text-zinc-200">Tags:</p>
                          <Badge
                            className="text-zinc-50"
                            variant="outline"
                            style={{
                              backgroundColor: vesselTypeData().color,
                            }}
                          >
                            {vesselTypeData().icon}
                            {vesselTypeData().title}
                          </Badge>
                        </section>
                        <section>
                          <TrackHistogram points={selectedShipTrack} height={64} />
                        </section>
                        <section>
                          <ActivityHistogram
                            types={selectedShipTrack.map((t) => t.type || "unknown")}
                            height={64}
                          />
                        </section>
                        {/* Suspicious Activity Chart - only show if there's suspicious activity */}
                        {selected && (
                          <SuspiciousActivityChart
                            aisOffCount={selected.aisOffCount || 0}
                            eventsInNoTakeMpasCount={selected.eventsInNoTakeMpasCount || 0}
                            eventsInRfmoWithoutKnownAuthorizationCount={selected.eventsInRfmoWithoutKnownAuthorizationCount || 0}
                            height={64}
                          />
                        )}
                        {/* Port Calls Section */}
                        {selected && (
                          <PortCallsSection
                            vesselId={selected.imo || selected.mmsi || selected.id}
                            vesselName={selected.shipname}
                          />
                        )}
                        <Button variant='default' className='opacity-70' size='sm'>
                          Set up alerts
                        </Button>
                      </>
                    )}
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
                 </div>
         
         {/* Chat Overlay */}
         <ChatOverlay 
           isOpen={showChat}
           onToggle={() => setShowChat(!showChat)}
           selectedShipId={selectedShip || undefined}
         />
       </div>
     </TooltipProvider>
   );
 }