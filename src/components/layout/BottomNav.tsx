'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AresIcon } from '../ui/Icons';
import { NAV_ITEMS } from './nav-items';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#1E2E4E] bg-[#060A12]/95 backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors ${
                active ? 'bg-[#0B3D91] text-white' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <AresIcon name={item.icon} size={18} />
              <span>{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
