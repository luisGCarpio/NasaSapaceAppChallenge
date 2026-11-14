'use client';

import Link from 'next/link';
import { STATUS, type HealthEvaluation } from '@/domain/health';
import { useAres } from '@/context/AresContext';
import { AresIcon, type AresIconName } from '../ui/Icons';
import { StatusBadge } from '../ui/StatusBadge';

const BORDER_BY_STATUS = {
  [STATUS.GREEN]: 'border-emerald-500/40 bg-emerald-950/20',
  [STATUS.YELLOW]: 'border-amber-500/50 bg-amber-950/25',
  [STATUS.RED]: 'border-red-500/60 bg-red-950/30',
  [STATUS.INSUFFICIENT_DATA]: 'border-slate-600/60 bg-[#0B1220]',
};

export function PriorityAlertCard({
  evaluation,
  isSimulation,
  nasaReplayLabel,
}: {
  evaluation: HealthEvaluation;
  isSimulation: boolean;
  nasaReplayLabel?: string | null;
}) {
  const { openCommsWithMessage } = useAres();
  const cardTone = BORDER_BY_STATUS[evaluation.overallStatus];
  const conclusion = evaluation.crossConclusion;
  const firstTrace = conclusion.ruleTrace ?? evaluation.ruleTraces[0];

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${cardTone}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={evaluation.overallStatus} />
            <span className="rounded-full border border-[#1E2E4E] bg-[#060A12] px-2.5 py-0.5 font-mono text-[11px] text-slate-200 tabular-nums">
              Cobertura: {evaluation.coverage.presentCount}/{evaluation.coverage.totalCount} ({evaluation.coverage.coveragePct}%)
            </span>
            <span className="rounded-full border border-[#1E2E4E] bg-[#060A12] px-2.5 py-0.5 text-[11px] text-sky-200">
              {evaluation.quality.label}
            </span>
            {nasaReplayLabel ? (
              <span className="rounded-full border border-sky-400/40 bg-sky-950/70 px-2.5 py-0.5 text-[11px] text-sky-200">
                Dato Real NASA · {nasaReplayLabel}
              </span>
            ) : isSimulation ? (
              <span className="rounded-full border border-amber-400/40 bg-amber-950/70 px-2.5 py-0.5 text-[11px] text-amber-200">
                Simulación sintética
              </span>
            ) : null}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
            {conclusion.title}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-300">{conclusion.message}</p>
        </div>

        <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12]/90 px-4 py-3 text-right">
          <p className="text-[11px] font-medium text-slate-400">
            Índice Orientativo ({evaluation.scoreConfidence === 'high' ? 'completo' : evaluation.scoreConfidence === 'partial' ? 'parcial' : 'omiso'})
          </p>
          <p className="mt-0.5 font-mono text-2xl font-bold tabular-nums text-slate-100">
            {evaluation.readinessScore !== null ? `${evaluation.readinessScore}/100` : 'N/D'}
          </p>
        </div>
      </div>

      {evaluation.quality.recheckWindow ? (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
          <strong>Reevaluación sugerida:</strong> {evaluation.quality.recheckWindow}
          {evaluation.quality.reasons.length > 0 ? ` — ${evaluation.quality.reasons.join(' ')}` : ''}
        </div>
      ) : null}

      {evaluation.clinicalRestrictions.restrictStrenuousExercise ? (
        <div className="mt-3 rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-100">
          <strong>Restricción de actividad activa:</strong> Evitar ejercicio intenso hasta resolver:{' '}
          {evaluation.clinicalRestrictions.reasons.join(' ')}
        </div>
      ) : null}

      {firstTrace ? (
        <div className="mt-3 rounded-xl border border-[#1E2E4E] bg-[#060A12]/80 px-3 py-2.5 text-[11px] text-slate-300">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono font-semibold text-sky-300">
              Regla: {firstTrace.ruleId} · {firstTrace.evidenceTier}
            </span>
            <a
              href={firstTrace.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-300 underline underline-offset-2 hover:text-sky-200"
            >
              {firstTrace.sourceTitle}
            </a>
          </div>
          <p className="mt-1 text-slate-400">
            Umbral: {firstTrace.thresholdApplied} · Seguimiento: {firstTrace.followUpWindow} · Exclusión:{' '}
            {firstTrace.exclusions}
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <AresIcon name={conclusion.actionIcon as AresIconName} size={16} className="text-[#38BDF8]" />
          <span className="font-medium text-slate-100">Acción recomendada: {conclusion.actionText}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/registro"
            className="rounded-xl border border-[#1E2E4E] bg-[#0B1220] px-3.5 py-2 text-xs font-semibold text-slate-100 hover:border-[#38BDF8]"
          >
            {evaluation.valid ? 'Nueva observación' : 'Completar primer chequeo'}
          </Link>
          {evaluation.commsMessage ? (
            <button
              type="button"
              onClick={() => openCommsWithMessage(evaluation.commsMessage)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B3D91] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#105BD8]"
            >
              <AresIcon name="radio" size={14} />
              <span>Copiar resumen para bitácora</span>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
