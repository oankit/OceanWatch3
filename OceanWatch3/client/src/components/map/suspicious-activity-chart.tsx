import React, { useMemo, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface SuspiciousActivityChartProps {
  aisOffCount: number;
  eventsInNoTakeMpasCount: number;
  eventsInRfmoWithoutKnownAuthorizationCount: number;
  className?: string;
  height?: number;
  backgroundFill?: string;
}

const SUSPICIOUS_COLORS = [
  'rgba(255, 183, 77, 0.2)',
  'rgba(255, 140, 0, 0.2)',
  'rgba(255, 87, 34, 0.2)',
];

function brightenRgba(rgba: string, factor = 1.3) {
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

export default function SuspiciousActivityChart({
  aisOffCount,
  eventsInNoTakeMpasCount,
  eventsInRfmoWithoutKnownAuthorizationCount,
  className,
  height = 64,
  backgroundFill = 'transparent',
}: SuspiciousActivityChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { labels, counts, total } = useMemo(() => {
    const labels = ['AIS Off', 'No Take MPAs', 'No Authorization'];
    const counts = [aisOffCount, eventsInNoTakeMpasCount, eventsInRfmoWithoutKnownAuthorizationCount];
    const total = counts.reduce((a, b) => a + b, 0);
    return { labels, counts, total };
  }, [aisOffCount, eventsInNoTakeMpasCount, eventsInRfmoWithoutKnownAuthorizationCount]);

  const maxCount = useMemo(() => counts.reduce((m, v) => (v > m ? v : m), 0), [counts]);

  if (total === 0) {
    return null;
  }

  const W = 100;
  const H = 100;
  const MARGIN = { top: 4, right: 0, bottom: 4, left: 0 };
  const PW = W - MARGIN.left - MARGIN.right;
  const PH = H - MARGIN.top - MARGIN.bottom;

  const numBars = 3;
  const perCol = PW / numBars;
  const innerPad = 0;
  const barWidth = perCol * (1 - innerPad);
  const barOffset = 0;

  const yForCount = (count: number) => {
    if (maxCount <= 0) return MARGIN.top + PH;
    const h = (count / maxCount) * PH;
    return MARGIN.top + (PH - h);
  };

  const xForIndex = (i: number) => MARGIN.left + i * perCol + barOffset;
  const stroke = '#71717a';

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    display: 'grid',
    gridTemplateColumns: `repeat(${numBars}, 1fr)`,
    pointerEvents: 'none',
    width: '100%',
    height: '100%',
  };

  const formattedLabels = labels;

  return (
    <div className={className} style={{ position: 'relative', width: '100%' }}>
      <p className="text-zinc-300 text-xs font-pp-neue-mono mb-2 underline decoration-dashed underline-offset-2">Suspicious Activity</p>
      <svg
        role="img"
        aria-label="Suspicious activity chart"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%' }}
      >
        <rect x={0} y={0} width={W} height={H} fill={backgroundFill} />
        <line x1={0} y1={MARGIN.top + PH} x2={W} y2={MARGIN.top + PH} stroke={stroke} strokeWidth={0.5} opacity={0.8} />

        {counts.map((count, i) => {
          const x = xForIndex(i);
          const y = yForCount(count);
          const h = MARGIN.top + PH - y;
          const baseColor = SUSPICIOUS_COLORS[i];
          const isHovered = hoveredIndex === i;
          const fill = isHovered ? brightenRgba(baseColor) : baseColor;
          return (
            <rect
              key={labels[i]}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              fill={fill}
              stroke={stroke}
              strokeWidth={0.3}
              rx={0.5}
              style={{ transition: 'fill 0.15s', cursor: 'pointer', filter: isHovered ? 'brightness(1.15)' : undefined }}
            />
          );
        })}
      </svg>

      <div style={overlayStyle} aria-hidden>
        {counts.map((count, i) => (
          <Tooltip key={labels[i]}>
            <TooltipTrigger asChild>
              <div
                style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
                aria-label={`${labels[i]}: ${count}`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="flex flex-col">
                <span className="font-pp-neue-mono">{labels[i]}</span>
                <span className="text-zinc-300">{count} {count === 1 ? 'incident' : 'incidents'}</span>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="mt-1 text-[10px] text-zinc-400 font-pp-neue-mono" style={{ display: 'grid', gridTemplateColumns: `repeat(${numBars}, 1fr)`, gap: '0.25rem' }}>
        {formattedLabels.map((l, i) => (
          <div key={labels[i]} style={{ textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
} 