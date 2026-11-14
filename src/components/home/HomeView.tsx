'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { SystemId } from '@/domain/health';
import { useAres } from '@/context/AresContext';
import { BodySystemMap } from './BodySystemMap';
import { LastCheckinStrip } from './LastCheckinStrip';
import { PriorityAlertCard } from './PriorityAlertCard';
import { SystemDetailCard } from './SystemDetailCard';

export function HomeView() {
  const { state, activeSimulation, activeNasaReplay } = useAres();
  const [selectedSystem, setSelectedSystem] = useState<SystemId>('mind');

  if (!state) return null;

  const isSimulation = Boolean(activeSimulation);
  const isNasaReplay = Boolean(activeNasaReplay);
  const evaluation =
    activeNasaReplay?.evaluation ?? activeSimulation?.evaluation ?? state.evaluation;
  const vitals =
    activeNasaReplay?.vitals ?? activeSimulation?.vitals ?? state.currentVitals;

  const showCleanOnboarding = !isSimulation && !isNasaReplay && !evaluation.valid;

  return (
    <div className="space-y-5">
      {showCleanOnboarding ? (
        <div className="rounded-2xl border border-[#1E2E4E] bg-[#0B1220] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
            Bitácora personal limpia · cero registros inventados
          </p>
          <h1 className="mt-1 text-lg font-bold text-slate-100">
            Sin mediciones personales registradas todavía
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300">
            Eliminamos datos sintéticos precargados. Registra tu propia toma real (completa o parcial)
            o inspecciona el comportamiento del motor v3.0.0 sobre 3,965 observaciones reales de NASA OSDR y NLSP.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              href="/registro"
              className="rounded-xl bg-[#0B3D91] px-4 py-2 text-xs font-semibold text-white hover:bg-[#105BD8]"
            >
              Registrar chequeo real
            </Link>
            <Link
              href="/datos-nasa"
              className="rounded-xl border border-sky-500/40 bg-sky-950/40 px-4 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-950/70"
            >
              Explorar 3,965 observaciones NASA
            </Link>
          </div>
        </div>
      ) : null}

      <PriorityAlertCard
        evaluation={evaluation}
        isSimulation={isSimulation}
        nasaReplayLabel={
          activeNasaReplay
            ? `${activeNasaReplay.subjectId} · ${activeNasaReplay.studyId} (${activeNasaReplay.relativeLabel})`
            : null
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <BodySystemMap
            evaluation={evaluation}
            selectedSystem={selectedSystem}
            onSelectSystem={setSelectedSystem}
          />
        </div>
        <div className="lg:col-span-6">
          <SystemDetailCard system={evaluation.systems[selectedSystem]} baselines={evaluation.baselines} />
        </div>
      </div>

      <LastCheckinStrip
        vitals={vitals}
        lastCheckinAt={state.lastCheckinAt}
        isSimulation={isSimulation || isNasaReplay}
      />
    </div>
  );
}
