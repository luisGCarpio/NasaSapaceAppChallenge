import { STATUS, STATUS_LABELS, type HealthStatus } from '@/domain/health';

const STATUS_STYLE: Record<HealthStatus, { badge: string; dot: string }> = {
  [STATUS.GREEN]: {
    badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    dot: 'bg-[#26D07C]',
  },
  [STATUS.YELLOW]: {
    badge: 'bg-amber-950/80 text-amber-200 border-amber-500/40',
    dot: 'bg-[#FFBE2E]',
  },
  [STATUS.RED]: {
    badge: 'bg-red-950/85 text-red-200 border-red-500/50',
    dot: 'bg-[#FC3D21]',
  },
  [STATUS.INSUFFICIENT_DATA]: {
    badge: 'bg-slate-800/90 text-slate-200 border-slate-500/40',
    dot: 'bg-slate-400',
  },
};

export function StatusBadge({
  status,
  compact = false,
}: {
  status: HealthStatus;
  compact?: boolean;
}) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE[STATUS.INSUFFICIENT_DATA];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-medium tracking-tight ${
        compact ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm'
      } ${style.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden="true" />
      <span>{STATUS_LABELS[status]}</span>
    </span>
  );
}
