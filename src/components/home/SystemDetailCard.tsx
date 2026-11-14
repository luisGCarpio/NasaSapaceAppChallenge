import type { SystemEvaluation } from '@/domain/health';
import { AresIcon, type AresIconName } from '../ui/Icons';
import { SectionCard } from '../ui/SectionCard';
import { StatusBadge } from '../ui/StatusBadge';

export function SystemDetailCard({ system }: { system: SystemEvaluation }) {
  return (
    <SectionCard
      title={system.systemName}
      subtitle="Lectura analizada del subsistema"
      action={<StatusBadge status={system.status} />}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100">{system.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">{system.message}</p>
        </div>

        {system.reasons.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-slate-400">Factores detectados</p>
            <ul className="mt-1.5 space-y-1.5">
              {system.reasons.map((reason, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 rounded-lg border border-[#1E2E4E] bg-[#060A12] px-3 py-2 text-xs text-slate-200"
                >
                  <AresIcon name="info" size={14} className="mt-0.5 shrink-0 text-[#38BDF8]" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
            <AresIcon name={system.actionIcon as AresIconName} size={15} className="text-[#38BDF8]" />
            <span>Paso sugerido: {system.actionText}</span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Referencia técnica:{' '}
            <a
              href={system.reference.url}
              target="_blank"
              rel="noreferrer"
              className="text-sky-300 underline underline-offset-2 hover:text-sky-200"
            >
              {system.reference.source}
            </a>
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
