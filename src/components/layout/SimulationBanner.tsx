'use client';

import { useAres } from '@/context/AresContext';
import { AlertBanner } from '../ui/AlertBanner';

export function SimulationBanner() {
  const { activeSimulation, clearSimulation } = useAres();
  if (!activeSimulation) return null;

  return (
    <div className="mb-4">
      <AlertBanner
        tone="warning"
        title={`Modo Simulación activo: ${activeSimulation.label}`}
        description="Estos valores son de demostración en vivo y no modifican tu historial ni se guardan en tu perfil."
        action={
          <button
            type="button"
            onClick={clearSimulation}
            className="rounded-lg bg-amber-300 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-200 transition-colors"
          >
            Volver a mis datos reales
          </button>
        }
      />
    </div>
  );
}
