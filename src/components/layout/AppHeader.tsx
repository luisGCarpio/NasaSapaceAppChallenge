'use client';

import { useAres } from '@/context/AresContext';
import { AresIcon } from '../ui/Icons';

export function AppHeader() {
  const { state, simulatorOpen, setSimulatorOpen, logout } = useAres();
  if (!state) return null;

  const syncLabel =
    state.syncMeta.status === 'synced'
      ? 'Respaldo sincronizado'
      : state.syncMeta.status === 'pending_retry'
        ? `Pendiente reintento (${state.syncMeta.pendingCount})`
        : 'Almacenamiento local atómico';

  const syncColor =
    state.syncMeta.status === 'synced'
      ? 'border-emerald-500/40 text-emerald-300'
      : state.syncMeta.status === 'pending_retry'
        ? 'border-amber-500/40 text-amber-200'
        : 'border-slate-600/60 text-slate-300';

  return (
    <header className="sticky top-0 z-30 border-b border-[#1E2E4E] bg-[#060A12]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B3D91] text-white shadow-sm">
            <AresIcon name="activity" size={20} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-100">A.R.E.S. Pulse</p>
            <p className="text-xs text-slate-400">
              {state.user.name} · {state.user.role}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            title={state.syncMeta.lastError ?? syncLabel}
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${syncColor}`}
          >
            <AresIcon name="sync" size={13} />
            <span>{syncLabel}</span>
          </span>

          <button
            type="button"
            onClick={() => setSimulatorOpen(!simulatorOpen)}
            aria-expanded={simulatorOpen}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#1E2E4E] bg-[#0B1220] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-[#38BDF8] hover:text-white transition-colors"
          >
            <AresIcon name="sliders" size={15} />
            <span>Simulador</span>
          </button>

          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Cerrar sesión"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#1E2E4E] bg-[#0B1220] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-red-500/60 hover:text-red-200 transition-colors"
          >
            <AresIcon name="logout" size={15} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
