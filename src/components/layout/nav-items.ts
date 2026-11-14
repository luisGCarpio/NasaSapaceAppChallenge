import type { AresIconName } from '../ui/Icons';

export interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: AresIconName;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Estado Actual', shortLabel: 'Hoy', icon: 'home' },
  { href: '/registro', label: 'Nuevo Chequeo', shortLabel: 'Registro', icon: 'plus' },
  { href: '/historial', label: 'Tendencias e Historial', shortLabel: 'Historial', icon: 'history' },
  { href: '/bienestar', label: 'Bienestar y Equipo', shortLabel: 'Bienestar', icon: 'shield' },
];
