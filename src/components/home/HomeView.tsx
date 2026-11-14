'use client';

import { useState } from 'react';
import type { SystemId } from '@/domain/health';
import { useAres } from '@/context/AresContext';
import { BodySystemMap } from './BodySystemMap';
import { LastCheckinStrip } from './LastCheckinStrip';
import { PriorityAlertCard } from './PriorityAlertCard';
import { SystemDetailCard } from './SystemDetailCard';

export function HomeView() {
  const { state, activeSimulation } = useAres();
  const [selectedSystem, setSelectedSystem] = useState<SystemId>('mind');

  if (!state) return null;

  const isSimulation = Boolean(activeSimulation);
  const evaluation = activeSimulation?.evaluation ?? state.evaluation;
  const vitals = activeSimulation?.vitals ?? state.currentVitals;

  return (
    <div className="space-y-5">
      <PriorityAlertCard evaluation={evaluation} isSimulation={isSimulation} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <BodySystemMap
            evaluation={evaluation}
            selectedSystem={selectedSystem}
            onSelectSystem={setSelectedSystem}
          />
        </div>
        <div className="lg:col-span-6">
          <SystemDetailCard system={evaluation.systems[selectedSystem]} />
        </div>
      </div>

      <LastCheckinStrip
        vitals={vitals}
        lastCheckinAt={state.lastCheckinAt}
        isSimulation={isSimulation}
      />
    </div>
  );
}
