import React, { useMemo, useState } from 'react';
import type { TrackPoint } from '@/pages/api/get-ship-track';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface TrackHistogramProps {
  points: TrackPoint[];
  className?: string;
  height?: number; // in pixels
  fill?: string;
  backgroundFill?: string;
}

export default function TrackHistogram({
  points,
  className,
  height = 64,
  fill = 'rgba(161,161,170,0.6)', // zinc-400 at ~60%
  backgroundFill = 'transparent',
}: TrackHistogramProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const { bins, minTs, maxTs } = useMemo(() => {
    const timestamps = points
      .map((p) => p.t)
      .filter((t): t is string => Boolean(t))
      .map((t) => Date.parse(t))
      .filter((n) => Number.isFinite(n));

    const counts = new Array<number>(20).fill(0);

    if (timestamps.length === 0) {
      return { bins: counts, minTs: null as number | null, maxTs: null as number | null };
    }

    const minV = Math.min(...timestamps);
    const maxV = Math.max(...timestamps);

    if (minV === maxV) {
      counts[counts.length - 1] = timestamps.length;
      return { bins: counts, minTs: minV, maxTs: maxV };
    }

    const range = maxV - minV;
    const step = range / 20;

    for (const ts of timestamps) {
      const idx = Math.min(19, Math.floor((ts - minV) / step));
      counts[idx] += 1;
    }

    return { bins: counts, minTs: minV, maxTs: maxV };
  }, [points]);

  const maxCount = useMemo(() => bins.reduce((m, v) => (v > m ? v : m), 0), [bins]);

  // Full-bleed bars: remove large label margins inside SVG
  const W = 100;
  const H = 100;
  const MARGIN = { top: 4, right: 0, bottom: 4, left: 0 };
  const PW = W - MARGIN.left - MARGIN.right;
  const PH = H - MARGIN.top - MARGIN.bottom;

  const perCol = PW / 20;
  const barInnerPadding = 0.2; // 20% inner padding
  const barWidth = perCol * (1 - barInnerPadding);
  const barOffset = (perCol - barWidth) / 2;

  const yForCount = (count: number) => {
    if (maxCount <= 0) return MARGIN.top + PH; // zero height
    const h = (count / maxCount) * PH;
    return MARGIN.top + (PH - h);
  };

  const xForIndex = (i: number) => MARGIN.left + i * perCol + barOffset;

  const stroke = '#71717a'; // zinc-500

  const formatDate = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };
  const formatDateTime = (d: Date) => {
    const ddmmyyyy = formatDate(d);
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${ddmmyyyy} ${hh}:${mi}`;
  };

  const stepMs = useMemo(() => {
    if (minTs == null || maxTs == null) return null;
    const range = maxTs - minTs;
    return range / 20;
  }, [minTs, maxTs]);

  // Tooltip overlay grid covering the plot area
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(20, 1fr)',
    pointerEvents: 'none',
    width: '100%',
    height: '100%'
  };

  // Compute a brighter fill for highlight
  function brightenRgba(rgba: string, factor = 1.5) {
    // Only supports rgba(r,g,b,a) or rgb(r,g,b)
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
    if (!match) return rgba;
    let [r, g, b, a] = match.slice(1);
    r = Math.min(255, Math.round(Number(r) * factor)).toString();
    g = Math.min(255, Math.round(Number(g) * factor)).toString();
    b = Math.min(255, Math.round(Number(b) * factor)).toString();
    if (typeof a === 'undefined') {
      return `rgb(${r},${g},${b})`;
    }
    return `rgba(${r},${g},${b},${a})`;
  }

  return (
    <div className={className} style={{ position: 'relative', width: '100%' }}>
      <p className='text-zinc-300 text-xs font-pp-neue-mono mb-2 underline decoration-dashed underline-offset-2'>Event Histogram</p>
      <svg
        role="img"
        aria-label="Track event histogram"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%' }}
      >
        {/* background */}
        <rect x={0} y={0} width={W} height={H} fill={backgroundFill} />

        {/* baseline */}
        <line x1={0} y1={MARGIN.top + PH} x2={W} y2={MARGIN.top + PH} stroke={stroke} strokeWidth={0.5} opacity={0.8} />

        {/* bars */}
        {bins.map((count, i) => {
          const x = xForIndex(i);
          const y = yForCount(count);
          const h = MARGIN.top + PH - y;
          const isHovered = hoveredBar === i;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              fill={isHovered ? brightenRgba(fill) : fill}
              stroke={stroke}
              strokeWidth={0.3}
              rx={0.5}
              style={{
                transition: 'fill 0.15s',
                cursor: 'pointer',
                // Optionally, add a drop shadow or filter for more pop
                filter: isHovered ? 'brightness(1.2)' : undefined,
              }}
            />
          );
        })}
      </svg>

      {/* Tooltip overlay (20 equal columns) */}
      <div style={overlayStyle} aria-hidden>
        {new Array(20).fill(0).map((_, i) => {
          const count = bins[i] ?? 0;
          const start = stepMs != null && minTs != null ? new Date(minTs + i * stepMs) : null;
          const end = stepMs != null && minTs != null ? new Date(minTs + (i + 1) * stepMs) : null;
          const label = start && end ? `${formatDateTime(start)} – ${formatDateTime(end)}` : 'No data';
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
                  aria-label={`Bin ${i + 1}: ${count} events${start && end ? `, ${label}` : ''}`}
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="flex flex-col">
                  <span className="font-pp-neue-mono">{count} events</span>
                  <span className="text-zinc-300">{label}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* External first/last labels to avoid squish inside SVG */}
      {minTs != null && maxTs != null && (
        <div className="mt-1 text-[10px] text-zinc-400 font-pp-neue-mono" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <span>{formatDate(new Date(minTs))}</span>
          <span>{formatDate(new Date(maxTs))}</span>
        </div>
      )}
    </div>
  );
} 