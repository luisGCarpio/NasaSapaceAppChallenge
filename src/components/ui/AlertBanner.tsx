import type { ReactNode } from 'react';
import { AresIcon, type AresIconName } from './Icons';

type BannerTone = 'info' | 'warning' | 'danger' | 'success';

const TONE_MAP: Record<BannerTone, { wrapper: string; icon: AresIconName }> = {
  info: { wrapper: 'border-sky-500/40 bg-sky-950/50 text-sky-100', icon: 'info' },
  warning: { wrapper: 'border-amber-500/45 bg-amber-950/55 text-amber-100', icon: 'alert' },
  danger: { wrapper: 'border-red-500/50 bg-red-950/60 text-red-100', icon: 'alert' },
  success: { wrapper: 'border-emerald-500/45 bg-emerald-950/50 text-emerald-100', icon: 'check' },
};

export function AlertBanner({
  tone,
  title,
  description,
  action,
}: {
  tone: BannerTone;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const cfg = TONE_MAP[tone];
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${cfg.wrapper}`}
    >
      <div className="flex items-start gap-3">
        <AresIcon name={cfg.icon} size={18} className="mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">{title}</p>
          {description ? <p className="mt-0.5 text-xs opacity-90">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
