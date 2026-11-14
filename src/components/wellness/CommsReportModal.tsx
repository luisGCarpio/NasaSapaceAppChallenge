'use client';

import { useEffect, useState } from 'react';
import { useAres } from '@/context/AresContext';
import { useClipboardReport } from '@/hooks/useClipboardReport';
import { AresIcon } from '../ui/Icons';
import { StatusBadge } from '../ui/StatusBadge';

export function CommsReportModal() {
  const { state, activeSimulation, commsOpen, commsDraftMessage, closeComms, applyUpdatedState } =
    useAres();
  const [message, setMessage] = useState('');
  const { submitting, status, copyAndLog, resetStatus } = useClipboardReport(applyUpdatedState);

  const activeEvaluation = activeSimulation?.evaluation ?? state?.evaluation;

  useEffect(() => {
    if (commsOpen) {
      setMessage(commsDraftMessage || activeEvaluation?.commsMessage || '');
      resetStatus();
    }
  }, [commsOpen, commsDraftMessage, activeEvaluation?.commsMessage, resetStatus]);

  if (!commsOpen || !state || !activeEvaluation) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comms-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#1E2E4E] bg-[#0B1220] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#1E2E4E] pb-3">
          <div>
            <h2 id="comms-modal-title" className="text-base font-semibold text-slate-100">
              Reporte para Equipo / Control de Tierra
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Copia verificada al portapapeles y registro auditable en bitácora.
            </p>
          </div>
          <button
            type="button"
            onClick={closeComms}
            aria-label="Cerrar reporte"
            className="rounded-lg border border-[#1E2E4E] p-1.5 text-slate-300 hover:text-white"
          >
            <AresIcon name="close" size={16} />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <StatusBadge status={activeEvaluation.overallStatus} />
          <span className="font-mono text-xs tabular-nums text-slate-300">
            Índice:{' '}
            {activeEvaluation.readinessScore !== null ? `${activeEvaluation.readinessScore}/100` : 'N/D'}
          </span>
        </div>

        <label htmlFor="comms-report-textarea" className="mt-3 block text-xs font-medium text-slate-300">
          Mensaje estructurado
        </label>
        <textarea
          id="comms-report-textarea"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3 font-mono text-xs text-slate-100"
        />

        {status ? (
          <p
            role="status"
            className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
              status.requiresManualCopy
                ? 'border-amber-500/40 bg-amber-950/50 text-amber-100'
                : 'border-emerald-500/40 bg-emerald-950/50 text-emerald-100'
            }`}
          >
            {status.feedbackText}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeComms}
            className="rounded-xl border border-[#1E2E4E] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={submitting || !message.trim()}
            onClick={() =>
              void copyAndLog({
                message,
                overallStatus: activeEvaluation.overallStatus,
                readinessScore: activeEvaluation.readinessScore,
              })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#105BD8] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            <AresIcon name="clipboard" size={15} />
            <span>{submitting ? 'Registrando...' : 'Copiar y registrar envío'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
