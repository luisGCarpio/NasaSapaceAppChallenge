'use client';

export type TrendMetricKey =
  | 'readinessScore'
  | 'heart_rate'
  | 'bp_systolic'
  | 'glucose'
  | 'sleep_hours'
  | 'temperature';

export const TREND_METRICS: Array<{ key: TrendMetricKey; label: string; unit: string }> = [
  { key: 'readinessScore', label: 'Índice', unit: 'pts' },
  { key: 'heart_rate', label: 'Pulso', unit: 'BPM' },
  { key: 'bp_systolic', label: 'Sistólica', unit: 'mmHg' },
  { key: 'glucose', label: 'Glucosa', unit: 'mg/dL' },
  { key: 'sleep_hours', label: 'Sueño', unit: 'h' },
  { key: 'temperature', label: 'Temp', unit: '°C' },
];

export function DateFilterBar({
  selectedMetric,
  rangeLimit,
  onSelectMetric,
  onSelectRange,
}: {
  selectedMetric: TrendMetricKey;
  rangeLimit: number;
  onSelectMetric: (metric: TrendMetricKey) => void;
  onSelectRange: (limit: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Indicador de tendencia">
        {TREND_METRICS.map((item) => {
          const active = selectedMetric === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectMetric(item.key)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'border-[#38BDF8] bg-[#0B3D91] text-white'
                  : 'border-[#1E2E4E] bg-[#060A12] text-slate-300 hover:border-slate-500'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        {[3, 5, 10].map((limit) => (
          <button
            key={limit}
            type="button"
            onClick={() => onSelectRange(limit)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-mono transition-colors ${
              rangeLimit === limit
                ? 'border-[#38BDF8] bg-[#101A2E] text-sky-200'
                : 'border-[#1E2E4E] bg-[#060A12] text-slate-400 hover:text-slate-200'
            }`}
          >
            {limit}d
          </button>
        ))}
      </div>
    </div>
  );
}
