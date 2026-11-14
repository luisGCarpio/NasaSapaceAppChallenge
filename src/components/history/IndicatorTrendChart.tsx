'use client';

import type { CheckinEntry } from '@/server/storage/types';
import { TREND_METRICS, type TrendMetricKey } from './DateFilterBar';

function readMetricValue(entry: CheckinEntry, metric: TrendMetricKey): number | null {
  if (metric === 'readinessScore') return entry.readinessScore ?? null;
  const v = entry.vitals[metric];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function IndicatorTrendChart({
  entries,
  metric,
}: {
  entries: CheckinEntry[];
  metric: TrendMetricKey;
}) {
  const meta = TREND_METRICS.find((m) => m.key === metric) ?? TREND_METRICS[0];

  const validItems = entries
    .map((entry, idx) => ({ entry, idx, val: readMetricValue(entry, metric) }))
    .filter((item): item is { entry: CheckinEntry; idx: number; val: number } => item.val !== null);

  if (entries.length === 0 || validItems.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-[#1E2E4E] bg-[#060A12] px-4 text-center text-xs text-slate-400">
        {entries.length === 0
          ? 'Aún no hay observaciones reales registradas para graficar.'
          : `Sin mediciones registradas de ${meta.label} en las fechas visibles (no se interpolan ausencias).`}
      </div>
    );
  }

  const values = validItems.map((i) => i.val);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax === rawMin ? Math.max(1, rawMax * 0.2) : rawMax - rawMin;
  const minVal = rawMin - span * 0.15;
  const maxVal = rawMax + span * 0.15;

  const width = 620;
  const height = 180;
  const padX = 36;
  const padY = 24;

  const points = validItems.map((item) => {
    const x =
      entries.length === 1
        ? width / 2
        : padX + (item.idx / (entries.length - 1)) * (width - padX * 2);
    const ratio = (item.val - minVal) / (maxVal - minVal || 1);
    const y = height - padY - ratio * (height - padY * 2);
    return { x, y, val: item.val, dateKey: item.entry.dateKey };
  });

  // Only connect directly adjacent consecutive entries (gaps stay visually uninterpolated)
  const segments: string[] = [];
  for (let i = 0; i < validItems.length - 1; i++) {
    if (validItems[i + 1].idx - validItems[i].idx === 1) {
      segments.push(
        `M ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} L ${points[i + 1].x.toFixed(1)} ${points[i + 1].y.toFixed(1)}`
      );
    }
  }

  return (
    <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          Tendencia real: <strong className="text-slate-200">{meta.label}</strong> ({meta.unit})
        </span>
        <span className="font-mono tabular-nums">
          n={validItems.length} · Min {rawMin} · Max {rawMax}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full overflow-visible"
        role="img"
        aria-label={`Gráfico de evolución real de ${meta.label}`}
      >
        <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="#1E2E4E" strokeDasharray="3 3" />
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#1E2E4E" />

        {segments.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ))}

        {points.map((p) => (
          <g key={p.dateKey}>
            <circle cx={p.x} cy={p.y} r="5" fill="#38BDF8" stroke="#060A12" strokeWidth="2" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-slate-200 font-mono text-[11px]">
              {p.val}
            </text>
            <text x={p.x} y={height - 6} textAnchor="middle" className="fill-slate-400 font-mono text-[10px]">
              {p.dateKey.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
