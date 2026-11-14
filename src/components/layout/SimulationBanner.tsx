'use client';

import { useAres } from '@/context/AresContext';
import { AlertBanner } from '../ui/AlertBanner';

export function SimulationBanner() {
  const { activeSimulation, activeNasaReplay, clearSimulation, clearNasaReplay } = useAres();

  if (activeNasaReplay) {
    return (
      <div className="mb-4">
        <AlertBanner
          tone="info"
          title={`Caso Real NASA (solo lectura): ${activeNasaReplay.subjectId} · ${activeNasaReplay.studyId}`}
          description={`Cohorte ${activeNasaReplay.cohortGroup} (${activeNasaReplay.relativeLabel}). Evaluado longitudinalmente con motor v3.0.0 sin modificar tu bitácora personal.`}
          action={
            <button
              type="button"
              onClick={clearNasaReplay}
              className="rounded-lg bg-sky-300 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-200 transition-colors"
            >
              Volver a mi bitácora
            </button>
          }
        />
      </div>
    );
  }

  if (!activeSimulation) return null;

  return (
    <div className="mb-4">
      <AlertBanner
        tone="warning"
        title={`Simulación sintética activa: ${activeSimulation.label}`}
        description="Estos valores son de entrenamiento en vivo y no modifican tu historial real ni se guardan en disco."
        action={
          <button
            type="button"
            onClick={clearSimulation}
            className="rounded-lg bg-amber-300 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-200 transition-colors"
          >
            Volver a mi bitácora
          </button>
        }
      />
    </div>
  );
}
