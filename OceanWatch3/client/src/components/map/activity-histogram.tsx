import React, { useMemo, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface ActivityHistogramProps {
  types: string[];
  className?: string;
  height?: number;
  backgroundFill?: string;
}

const COOL_COLORS = [
  'rgba(125, 211, 252, 0.3)',
  'rgba(147, 197, 253, 0.3)', 
  'rgba(165, 180, 252, 0.3)', 
  'rgba(186, 230, 253, 0.3)', 
  'rgba(191, 219, 254, 0.3)',
  'rgba(196, 181, 253, 0.3)',
  'rgba(167, 243, 208, 0.3)', 
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

function toTitleCaseFromSnake(input: string): string {
  return input
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function ActivityHistogram({
  types,
  className,
  height = 64,
  backgroundFill = 'transparent',
}: ActivityHistogramProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { labels, counts, total } = useMemo(() => {
    const freq = new Map<string, number>();
    for (const t of types) {
      if (!t) continue;
      freq.set(t, (freq.get(t) || 0) + 1);
    }
    const labels = Array.from(freq.keys());
    const counts = labels.map((l) => freq.get(l) || 0);
    const total = counts.reduce((a, b) => a + b, 0);
    return { labels, counts, total };
  }, [types]);

  const maxCount = useMemo(() => counts.reduce((m, v) => (v > m ? v : m), 0), [counts]);

  // SVG logical coords
  const W = 100;
  const H = 100;
  const MARGIN = { top: 4, right: 0, bottom: 4, left: 0 };
  const PW = W - MARGIN.left - MARGIN.right;
  const PH = H - MARGIN.top - MARGIN.bottom;

  const numBars = Math.max(1, labels.length);
  const perCol = PW / numBars;
  const innerPad = 0; // no inner padding
  const barWidth = perCol * (1 - innerPad);
  const barOffset = 0;

  const yForCount = (count: number) => {
    if (maxCount <= 0) return MARGIN.top + PH;
    const h = (count / maxCount) * PH;
    return MARGIN.top + (PH - h);
  };

  const xForIndex = (i: number) => MARGIN.left + i * perCol + barOffset;
  const stroke = '#71717a'; // zinc-500

  // Tooltip overlay grid covering plot area
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

  // Precompute formatted labels and percentages
  const showPercent = labels.length <= 2 && total > 0;
  const formattedLabels = labels.map((l, i) => {
    const pretty = toTitleCaseFromSnake(l || 'Unknown');
    if (!showPercent) return pretty;
    const pct = Math.round((counts[i] / total) * 100);
    return `${pretty} (${pct}%)`;
  });

  return (
    <div className={className} style={{ position: 'relative', width: '100%' }}>
      <p className="text-zinc-300 text-xs font-pp-neue-mono mb-2 underline decoration-dashed underline-offset-2">Activity Histogram</p>
      <svg
        role="img"
        aria-label="Activity type histogram"
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
          const baseColor = COOL_COLORS[i % COOL_COLORS.length];
          const isHovered = hoveredIndex === i;
          const fill = isHovered ? brightenRgba(baseColor) : baseColor;
          return (
            <rect
              key={labels[i] || i}
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

      {/* Tooltip overlay */}
      <div style={overlayStyle} aria-hidden>
        {counts.map((count, i) => (
          <Tooltip key={labels[i] || i}>
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
                <span className="font-pp-neue-mono">{toTitleCaseFromSnake(labels[i] || 'Unknown')}</span>
                <span className="text-zinc-300">{count} events</span>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* External labels aligned in a grid below */}
      {labels.length > 0 && (
        <div className="mt-1 text-[10px] text-zinc-400 font-pp-neue-mono" style={{ display: 'grid', gridTemplateColumns: `repeat(${numBars}, 1fr)`, gap: '0.25rem' }}>
          {formattedLabels.map((l, i) => (
            <div key={labels[i] || i} style={{ textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l}>
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 