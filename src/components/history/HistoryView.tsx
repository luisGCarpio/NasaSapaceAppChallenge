'use client';

import { useState } from 'react';
import { useAres } from '@/context/AresContext';
import type { CheckinEntry } from '@/server/storage/types';
import { SectionCard } from '../ui/SectionCard';
import { CheckinDetailModal } from './CheckinDetailModal';
import { CheckinHistoryTable } from './CheckinHistoryTable';
import { DateFilterBar, type TrendMetricKey } from './DateFilterBar';
import { IndicatorTrendChart } from './IndicatorTrendChart';

export function HistoryView() {
  const { state } = useAres();
  const [selectedMetric, setSelectedMetric] = useState<TrendMetricKey>('readinessScore');
  const [rangeLimit, setRangeLimit] = useState<number>(10);
  const [inspectedEntry, setInspectedEntry] = useState<CheckinEntry | null>(null);

  if (!state) return null;

  const filteredEntries = state.history.slice(-rangeLimit);

  return (
    <div className="space-y-5">
      <SectionCard
        title="Evolución Histórica"
        subtitle="Serie cronológica consolidada por día calendario sin datos inventados"
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
        title="Bitácora de Chequeos"
        subtitle="Haz clic en Detalle para revisar el diagnóstico cruzado completo de cualquier día"
      >
        <CheckinHistoryTable entries={filteredEntries} onInspect={setInspectedEntry} />
      </SectionCard>

      <CheckinDetailModal entry={inspectedEntry} onClose={() => setInspectedEntry(null)} />
    </div>
  );
}
