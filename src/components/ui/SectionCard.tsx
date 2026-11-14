import type { ReactNode } from 'react';

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#1E2E4E] bg-[#0B1220] p-4 sm:p-5 shadow-sm ${className}`}
    >
      {title || subtitle || action ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-semibold text-slate-100">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-xs sm:text-sm text-slate-400">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
