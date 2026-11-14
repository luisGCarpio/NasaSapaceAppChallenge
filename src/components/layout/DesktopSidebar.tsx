'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAres } from '@/context/AresContext';
import { AresIcon } from '../ui/Icons';
import { NAV_ITEMS } from './nav-items';

export function DesktopSidebar() {
  const pathname = usePathname();
  const { state, activeSimulation, activeNasaReplay, openCommsWithMessage } = useAres();
  const evaluation = activeNasaReplay?.evaluation ?? activeSimulation?.evaluation ?? state?.evaluation;

  return (
    <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:justify-between border-r border-[#1E2E4E] bg-[#0B1220]/70 p-4">
      <nav aria-label="Navegación principal" className="space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#0B3D91] text-white'
                  : 'text-slate-300 hover:bg-[#101A2E] hover:text-white'
              }`}
            >
              <AresIcon name={item.icon} size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {evaluation?.commsMessage ? (
        <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3">
          <p className="text-xs font-medium text-slate-300">Comunicación rápida</p>
          <p className="mt-1 text-xs text-slate-400">
            Genera un resumen listo para compartir con tu equipo o Control de Tierra.
          </p>
          <button
            type="button"
            onClick={() => openCommsWithMessage(evaluation.commsMessage)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#105BD8] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            <AresIcon name="radio" size={14} />
            <span>Avisar en 1 clic</span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}
