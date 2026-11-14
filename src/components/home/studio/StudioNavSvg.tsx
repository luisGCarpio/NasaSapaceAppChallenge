'use client';

import type { ReactNode } from 'react';
import type { TabKey } from './studio-types';

export const STUDIO_NAV_ITEMS: Array<{
  key: TabKey;
  href: string;
  label: string;
  mobileLabel: string;
  icon: ReactNode;
}> = [
  {
    key: 'astro',
    href: '/',
    label: 'Astronauta',
    mobileLabel: 'Astronauta',
    icon: (
      <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v5a7 7 0 0 0 14 0v-5a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4Z" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
  {
    key: 'controls',
    href: '/registro',
    label: 'Controles del Cuerpo',
    mobileLabel: 'Controles',
    icon: (
      <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
  },
  {
    key: 'monitor',
    href: '/historial',
    label: 'Monitor en Vivo',
    mobileLabel: 'Monitor',
    icon: (
      <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h4l3-7 4 14 3-7h4" />
      </svg>
    ),
  },
  {
    key: 'missions',
    href: '/bienestar',
    label: 'Misiones de Hoy',
    mobileLabel: 'Misiones',
    icon: (
      <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    key: 'nasa',
    href: '/datos-nasa',
    label: 'Datos Reales NASA',
    mobileLabel: 'NASA',
    icon: (
      <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-25 12 12)" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      </svg>
    ),
  },
];
