'use client';

import type { HealthEvaluation } from '@/domain/health';
import { AresIcon } from '../ui/Icons';
import { SectionCard } from '../ui/SectionCard';
import { StatusBadge } from '../ui/StatusBadge';

export function PreliminaryPreview({ evaluation }: { evaluation: HealthEvaluation }) {
  const sysList = [evaluation.systems.mind, evaluation.systems.heart, evaluation.systems.body];

  return (
    <SectionCard
      title="Previsualización en vivo"
      subtitle="Resultado calculado por el motor antes de guardar"
      action={<StatusBadge status={evaluation.overallStatus} />}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">Índice Orientativo</span>
            <span className="font-mono text-lg font-bold tabular-nums text-slate-100">
              {evaluation.readinessScore !== null ? `${evaluation.readinessScore}/100` : 'N/D'}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-100">{evaluation.crossConclusion.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            {evaluation.crossConclusion.message}
          </p>
        </div>

        <div className="space-y-2">
          {sysList.map((sys) => (
            <div
              key={sys.systemId}
              className="flex items-center justify-between gap-2 rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3 py-2"
            >
              <span className="text-xs font-medium text-slate-200">{sys.systemName}</span>
              <StatusBadge status={sys.status} compact />
            </div>
          ))}
        </div>

        {!evaluation.valid && evaluation.errors.length > 0 ? (
          <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-200">
              <AresIcon name="alert" size={15} />
              <span>Completa o corrige los siguientes campos:</span>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-red-200/90">
              {evaluation.errors.slice(0, 4).map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
