'use client';

import type { ReactNode } from 'react';
import type { TabKey } from './studio-types';

const NAV_SVG_PROPS = {
  className: 'nav-icon',
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.15,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

export function StudioNavIcon({ tab, active = false }: { tab: TabKey; active?: boolean }) {
  switch (tab) {
    case 'astro':
      return active ? (
        <svg {...NAV_SVG_PROPS}>
          <path
            d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v5a7 7 0 0 0 14 0v-5a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4Zm-4 8.5h8a1.5 1.5 0 0 1 0 3H8a1.5 1.5 0 0 1 0-3Z"
            fill="currentColor"
            fillRule="evenodd"
            stroke="none"
          />
        </svg>
      ) : (
        <svg {...NAV_SVG_PROPS}>
          <path
            d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v5a7 7 0 0 0 14 0v-5a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4Z"
            vectorEffect="non-scaling-stroke"
          />
          <path d="M8 12h8" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'controls':
      return active ? (
        <svg {...NAV_SVG_PROPS}>
          <line x1="4" y1="21" x2="4" y2="3" vectorEffect="non-scaling-stroke" />
          <line x1="12" y1="21" x2="12" y2="3" vectorEffect="non-scaling-stroke" />
          <line x1="20" y1="21" x2="20" y2="3" vectorEffect="non-scaling-stroke" />
          <circle cx="4" cy="14" r="2.6" fill="currentColor" stroke="none" />
          <circle cx="12" cy="8" r="2.6" fill="currentColor" stroke="none" />
          <circle cx="20" cy="16" r="2.6" fill="currentColor" stroke="none" />
        </svg>
      ) : (
        <svg {...NAV_SVG_PROPS}>
          <line x1="4" y1="21" x2="4" y2="14" vectorEffect="non-scaling-stroke" />
          <line x1="4" y1="10" x2="4" y2="3" vectorEffect="non-scaling-stroke" />
          <line x1="12" y1="21" x2="12" y2="12" vectorEffect="non-scaling-stroke" />
          <line x1="12" y1="8" x2="12" y2="3" vectorEffect="non-scaling-stroke" />
          <line x1="20" y1="21" x2="20" y2="16" vectorEffect="non-scaling-stroke" />
          <line x1="20" y1="12" x2="20" y2="3" vectorEffect="non-scaling-stroke" />
          <line x1="1" y1="14" x2="7" y2="14" vectorEffect="non-scaling-stroke" />
          <line x1="9" y1="8" x2="15" y2="8" vectorEffect="non-scaling-stroke" />
          <line x1="17" y1="16" x2="23" y2="16" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'monitor':
      return active ? (
        <svg {...NAV_SVG_PROPS}>
          <rect x="2.5" y="4" width="19" height="16" rx="3.5" fill="currentColor" fillOpacity={0.26} stroke="none" />
          <path d="M3 12h4l3-7 4 14 3-7h4" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : (
        <svg {...NAV_SVG_PROPS}>
          <path d="M3 12h4l3-7 4 14 3-7h4" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'missions':
      return active ? (
        <svg {...NAV_SVG_PROPS}>
          <path
            d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm3.7 7.1a1 1 0 0 0-1.4-1.4L11 11.5l-1.3-1.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
            fill="currentColor"
            fillRule="evenodd"
            stroke="none"
          />
        </svg>
      ) : (
        <svg {...NAV_SVG_PROPS}>
          <circle cx="12" cy="12" r="9" vectorEffect="non-scaling-stroke" />
          <path d="M9 12l2 2 4-4" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case 'nasa':
      return active ? (
        <svg {...NAV_SVG_PROPS}>
          <ellipse
            cx="12"
            cy="12"
            rx="9"
            ry="4"
            transform="rotate(-25 12 12)"
            fill="currentColor"
            fillOpacity={0.24}
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="12" cy="12" r="3.1" fill="currentColor" stroke="none" />
          <circle cx="18.6" cy="9" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      ) : (
        <svg {...NAV_SVG_PROPS}>
          <ellipse
            cx="12"
            cy="12"
            rx="9"
            ry="4"
            transform="rotate(-25 12 12)"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

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
    icon: <StudioNavIcon tab="astro" />,
  },
  {
    key: 'controls',
    href: '/registro',
    label: 'Controles del Cuerpo',
    mobileLabel: 'Controles',
    icon: <StudioNavIcon tab="controls" />,
  },
  {
    key: 'monitor',
    href: '/historial',
    label: 'Monitor en Vivo',
    mobileLabel: 'Monitor',
    icon: <StudioNavIcon tab="monitor" />,
  },
  {
    key: 'missions',
    href: '/bienestar',
    label: 'Misiones de Hoy',
    mobileLabel: 'Misiones',
    icon: <StudioNavIcon tab="missions" />,
  },
  {
    key: 'nasa',
    href: '/datos-nasa',
    label: 'Datos Reales NASA',
    mobileLabel: 'NASA',
    icon: <StudioNavIcon tab="nasa" />,
  },
];
