'use client';

import { evaluateHealth } from '@/domain/health';
import type { CheckinEntry } from '@/server/storage/types';
import { AresIcon } from '../ui/Icons';
import { StatusBadge } from '../ui/StatusBadge';

export function CheckinDetailModal({
  entry,
  onClose,
}: {
  entry: CheckinEntry | null;
  onClose: () => void;
}) {
  if (!entry) return null;
  const evaluation = evaluateHealth(entry.vitals, { context: entry.context });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#1E2E4E] bg-[#0B1220] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#1E2E4E] pb-3">
          <div>
            <h2 id="detail-modal-title" className="text-base font-semibold text-slate-100">
              Chequeo del {entry.dateKey}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Registrado: {new Date(entry.timestamp).toLocaleString('es-CO')} · {entry.updatesCount}{' '}
              {entry.updatesCount === 1 ? 'actualización' : 'actualizaciones'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="rounded-lg border border-[#1E2E4E] p-1.5 text-slate-300 hover:text-white"
          >
            <AresIcon name="close" size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3">
            <StatusBadge status={evaluation.overallStatus} />
            <span className="font-mono text-sm font-bold tabular-nums text-slate-100">
              {evaluation.readinessScore !== null ? `${evaluation.readinessScore}/100` : 'N/D'}
            </span>
          </div>

          <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3.5">
            <p className="text-sm font-semibold text-slate-100">{evaluation.crossConclusion.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {evaluation.crossConclusion.message}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[evaluation.systems.mind, evaluation.systems.heart, evaluation.systems.body].map((sys) => (
              <div key={sys.systemId} className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3">
                <p className="text-xs font-medium text-slate-300">{sys.systemName}</p>
                <div className="mt-2">
                  <StatusBadge status={sys.status} compact />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
