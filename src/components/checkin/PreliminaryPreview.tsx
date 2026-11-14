'use client';

import type { HealthEvaluation } from '@/domain/health';
import { AresIcon } from '../ui/Icons';
import { SectionCard } from '../ui/SectionCard';
import { StatusBadge } from '../ui/StatusBadge';

export function PreliminaryPreview({ evaluation }: { evaluation: HealthEvaluation }) {
  const sysList = [evaluation.systems.mind, evaluation.systems.heart, evaluation.systems.body];

  return (
    <SectionCard
      title="Previsualización en vivo (v3.0.0)"
      subtitle="Separa urgencia, cobertura y calidad antes de guardar"
      action={<StatusBadge status={evaluation.overallStatus} />}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3">
            <p className="text-[11px] text-slate-400">Cobertura</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-slate-100 tabular-nums">
              {evaluation.coverage.presentCount}/{evaluation.coverage.totalCount} ({evaluation.coverage.coveragePct}%)
            </p>
          </div>
          <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3">
            <p className="text-[11px] text-slate-400">Índice Orientativo</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-slate-100 tabular-nums">
              {evaluation.readinessScore !== null ? `${evaluation.readinessScore}/100` : 'N/D'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3.5">
          <p className="text-[11px] font-medium text-sky-300">{evaluation.quality.label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{evaluation.crossConclusion.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            {evaluation.crossConclusion.message}
          </p>
          {evaluation.quality.recheckWindow ? (
            <p className="mt-2 text-[11px] text-amber-300">
              Ventana de confirmación: {evaluation.quality.recheckWindow}
            </p>
          ) : null}
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
