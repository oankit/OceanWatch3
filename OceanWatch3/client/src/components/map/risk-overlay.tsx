import { useEffect } from 'react';
import { Map as MapboxMap } from 'mapbox-gl';
import { RiskHeatPoint } from '@/pages/api/get-risk-zones';

interface RiskOverlayProps {
  map: MapboxMap | null;
  heatPoints: RiskHeatPoint[];
  mapReady: boolean;
}

export default function RiskOverlay({ map, heatPoints, mapReady }: RiskOverlayProps) {
  useEffect(() => {
    if (!map || !mapReady || heatPoints.length === 0) {
      return;
    }
    if (!(map as any).style || typeof (map as any).getStyle !== 'function') {
      return;
    }

    try {
      if (map.getLayer('risk-heatmap')) map.removeLayer('risk-heatmap');
      if (map.getSource('risk-heatmap')) map.removeSource('risk-heatmap');
    } catch (e) {}

    const features = heatPoints.map((point, index) => ({
      type: 'Feature' as const,
      properties: {
        riskScore: point.riskScore,
        vesselCount: point.vesselCount,
        id: index
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [point.lon, point.lat]
      }
    }));

    const geojson = {
      type: 'FeatureCollection' as const,
      features
    };

    map.addSource('risk-heatmap', {
      type: 'geojson',
      data: geojson as any
    });

    map.addLayer({
      id: 'risk-heatmap',
      type: 'heatmap',
      source: 'risk-heatmap',
      maxzoom: 15,
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'riskScore'],
          0, 0,
          1, 0.4,
          5, 0.8,
          10, 0.9,
          25, 0.7,
          40, 0.5,
          100, 0.3
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1.2,
          15, 4
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 0, 0, 0)',
          0.01, 'rgba(150, 150, 75, 0.15)',
          0.03, 'rgba(200, 200, 100, 0.15)',
          0.1, 'rgba(255, 235, 153, 0.2)',
          0.3, 'rgba(255, 215, 120, 0.25)',
          0.45, 'rgba(255, 190, 80, 0.25)',
          0.6, 'rgba(255, 165, 60, 0.25)',
          0.7, 'rgba(247, 140, 60, 0.275)',
          0.8, 'rgba(239, 120, 50, 0.3)',
          0.95, 'rgba(239, 138, 98, 0.3)',
          1, 'rgba(255, 87, 87, 0.3)'
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, [
            'interpolate',
            ['linear'],
            ['get', 'riskScore'],
            1, 80,
            3, 70,
            10, 45,
            50, 30
          ],
          15, [
            'interpolate',
            ['linear'],
            ['get', 'riskScore'],
            1, 240,
            3, 210,
            10, 135,
            50, 90
          ]
        ],
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 1,
          15, 0
        ]
      }
    });

    return () => {
      try {
        if (map.getLayer('risk-heatmap')) map.removeLayer('risk-heatmap');
        if (map.getSource('risk-heatmap')) map.removeSource('risk-heatmap');
      } catch (e) {}
    };

  }, [map, heatPoints, mapReady]);

  return null;
} 