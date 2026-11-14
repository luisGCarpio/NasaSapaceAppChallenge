'use client';

import { useState } from 'react';
import { useAres } from '@/context/AresContext';
import type { CheckinEntry } from '@/server/storage/types';
import { SectionCard } from '../ui/SectionCard';
import { StatusBadge } from '../ui/StatusBadge';
import { CheckinDetailModal } from './CheckinDetailModal';
import { CheckinHistoryTable } from './CheckinHistoryTable';
import { DateFilterBar, type TrendMetricKey } from './DateFilterBar';
import { IndicatorTrendChart } from './IndicatorTrendChart';

export function HistoryView() {
  const { state } = useAres();
  const [selectedMetric, setSelectedMetric] = useState<TrendMetricKey>('heart_rate');
  const [rangeLimit, setRangeLimit] = useState<number>(14);
  const [inspectedEntry, setInspectedEntry] = useState<CheckinEntry | null>(null);

  if (!state) return null;

  const filteredEntries = state.history.slice(-rangeLimit);
  const recentObservations = [...(state.observations ?? [])].reverse().slice(0, 20);

  return (
    <div className="space-y-5">
      <SectionCard
        title="Evolución Histórica"
        subtitle="Serie cronológica real sin interpolación en días faltantes ni valores inventados"
      >
        <div className="space-y-4">
          <DateFilterBar
            selectedMetric={selectedMetric}
            rangeLimit={rangeLimit}
            onSelectMetric={setSelectedMetric}
            onSelectRange={setRangeLimit}
          />
          <IndicatorTrendChart entries={filteredEntries} metric={selectedMetric} />
        </div>
      </SectionCard>

      <SectionCard
        title="Bitácora Consolidada por Día"
        subtitle="Resumen diario sin truncamiento destructivo (retención hasta 365 días)"
      >
        <CheckinHistoryTable entries={filteredEntries} onInspect={setInspectedEntry} />
      </SectionCard>

      <SectionCard
        title="Tomas Individuales Preservadas"
        subtitle="Cada medición conserva hora exacta, contexto, cobertura y calidad sin sobrescribirse"
      >
        {recentObservations.length === 0 ? (
          <p className="text-xs text-slate-400">
            Aún no has guardado observaciones individuales en tu bitácora personal.
          </p>
        ) : (
          <div className="space-y-2">
            {recentObservations.map((obs) => (
              <div
                key={obs.observationId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3.5 py-2.5 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={obs.overallStatus} compact />
                    <span className="font-mono text-slate-200">
                      {new Date(obs.capturedAt).toLocaleString('es-CO')}
                    </span>
                    <span className="text-slate-400">
                      · Cobertura {obs.coveragePct}% · {obs.qualityTier}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-400">
                    Contexto: {obs.context.activityState} / {obs.context.posture} · gluc:{' '}
                    {obs.context.glucoseTiming}
                    {obs.context.confirmedRepeated ? ' · confirmada' : ''}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-sky-300">
                  {[
                    obs.vitals.heart_rate != null ? `FC ${obs.vitals.heart_rate}` : null,
                    obs.vitals.bp_systolic != null
                      ? `PA ${obs.vitals.bp_systolic}/${obs.vitals.bp_diastolic}`
                      : null,
                    obs.vitals.temperature != null ? `T ${obs.vitals.temperature}°C` : null,
                    obs.vitals.glucose != null ? `Gluc ${obs.vitals.glucose}` : null,
                    obs.vitals.sleep_hours != null ? `Sueño ${obs.vitals.sleep_hours}h` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <CheckinDetailModal entry={inspectedEntry} onClose={() => setInspectedEntry(null)} />
    </div>
  );
}
