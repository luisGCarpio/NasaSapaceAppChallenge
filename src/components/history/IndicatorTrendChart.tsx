'use client';

import type { CheckinEntry } from '@/server/storage/types';
import { TREND_METRICS, type TrendMetricKey } from './DateFilterBar';

function readMetricValue(entry: CheckinEntry, metric: TrendMetricKey): number {
  if (metric === 'readinessScore') return entry.readinessScore ?? 0;
  return entry.vitals[metric];
}

export function IndicatorTrendChart({
  entries,
  metric,
}: {
  entries: CheckinEntry[];
  metric: TrendMetricKey;
}) {
  const meta = TREND_METRICS.find((m) => m.key === metric) ?? TREND_METRICS[0];

  if (entries.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-[#1E2E4E] bg-[#060A12] text-xs text-slate-400">
        Aún no hay chequeos reales registrados para graficar.
      </div>
    );
  }

  const values = entries.map((e) => readMetricValue(e, metric));
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax === rawMin ? Math.max(1, rawMax * 0.2) : rawMax - rawMin;
  const minVal = rawMin - span * 0.15;
  const maxVal = rawMax + span * 0.15;

  const width = 620;
  const height = 180;
  const padX = 36;
  const padY = 24;

  const points = entries.map((entry, idx) => {
    const val = readMetricValue(entry, metric);
    const x =
      entries.length === 1
        ? width / 2
        : padX + (idx / (entries.length - 1)) * (width - padX * 2);
    const ratio = (val - minVal) / (maxVal - minVal || 1);
    const y = height - padY - ratio * (height - padY * 2);
    return { x, y, val, dateKey: entry.dateKey };
  });

  const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          Tendencia real: <strong className="text-slate-200">{meta.label}</strong> ({meta.unit})
        </span>
        <span className="font-mono tabular-nums">
          Min {rawMin} · Max {rawMax}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full overflow-visible"
        role="img"
        aria-label={`Gráfico de evolución de ${meta.label}`}
      >
        <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="#1E2E4E" strokeDasharray="3 3" />
        <line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke="#1E2E4E"
        />

        {points.length > 1 ? (
          <polyline
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polyline}
          />
        ) : null}

        {points.map((p) => (
          <g key={p.dateKey}>
            <circle cx={p.x} cy={p.y} r="5" fill="#38BDF8" stroke="#060A12" strokeWidth="2" />
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              className="fill-slate-200 font-mono text-[11px]"
            >
              {p.val}
            </text>
            <text
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              className="fill-slate-400 font-mono text-[10px]"
            >
              {p.dateKey.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
