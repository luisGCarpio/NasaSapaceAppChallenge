'use client';

import { useState } from 'react';
import type { ScenarioId } from '@/domain/health';
import { useAres } from '@/context/AresContext';
import { AresIcon } from '../ui/Icons';
import { StatusBadge } from '../ui/StatusBadge';

export function ScenarioDrawer() {
  const {
    state,
    simulatorOpen,
    setSimulatorOpen,
    activeSimulation,
    runSimulation,
    clearSimulation,
  } = useAres();
  const [busyId, setBusyId] = useState<ScenarioId | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  if (!simulatorOpen || !state) return null;

  const scenarios = Object.values(state.scenarios);

  async function handleSelectScenario(id: ScenarioId) {
    setBusyId(id);
    setSimError(null);
    try {
      await runSimulation(id);
    } catch (err) {
      setSimError(err instanceof Error ? err.message : 'Error ejecutando escenario.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sim-drawer-title"
    >
      <div className="flex h-full w-full max-w-md flex-col border-l border-[#1E2E4E] bg-[#0B1220] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#1E2E4E] pb-4">
          <div>
            <h2 id="sim-drawer-title" className="text-base font-semibold text-slate-100">
              Simulador de Escenarios
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Prueba cómo responde el motor de reglas clínicas sin alterar tu historial personal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSimulatorOpen(false)}
            aria-label="Cerrar simulador"
            className="rounded-lg border border-[#1E2E4E] p-1.5 text-slate-300 hover:text-white"
          >
            <AresIcon name="close" size={16} />
          </button>
        </div>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {scenarios.map((scenario) => {
            const isSelected = activeSimulation?.id === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                disabled={busyId !== null}
                onClick={() => void handleSelectScenario(scenario.id)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  isSelected
                    ? 'border-[#38BDF8] bg-[#101A2E]'
                    : 'border-[#1E2E4E] bg-[#060A12] hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-100">{scenario.label}</span>
                  <StatusBadge status={scenario.status} compact />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{scenario.description}</p>
                <p className="mt-2 font-mono text-[11px] tabular-nums text-slate-300">
                  Pulso {scenario.vitals.heart_rate} BPM · PA {scenario.vitals.bp_systolic}/
                  {scenario.vitals.bp_diastolic} · Glucosa {scenario.vitals.glucose} mg/dL · Temp{' '}
                  {scenario.vitals.temperature} °C
                </p>
              </button>
            );
          })}
          {simError ? (
            <p role="alert" className="text-xs font-medium text-red-300">
              {simError}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#1E2E4E] pt-4">
          <button
            type="button"
            onClick={() => {
              clearSimulation();
              setSimulatorOpen(false);
            }}
            className="rounded-xl border border-[#1E2E4E] px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white"
          >
            Usar datos reales
          </button>
          <button
            type="button"
            onClick={() => setSimulatorOpen(false)}
            className="rounded-xl bg-[#0B3D91] px-4 py-2 text-xs font-semibold text-white hover:bg-[#105BD8]"
          >
            Ver resultado en panel
          </button>
        </div>
      </div>
    </div>
  );
}
