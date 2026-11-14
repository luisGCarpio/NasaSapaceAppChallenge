import type { SVGProps } from 'react';

export type AresIconName =
  | 'brain'
  | 'heart'
  | 'shield'
  | 'droplet'
  | 'activity'
  | 'moon'
  | 'wind'
  | 'radio'
  | 'sliders'
  | 'check'
  | 'alert'
  | 'info'
  | 'clipboard'
  | 'plus'
  | 'history'
  | 'home'
  | 'logout'
  | 'sync'
  | 'close'
  | 'arrow-right'
  | 'user';

interface AresIconProps extends SVGProps<SVGSVGElement> {
  name: AresIconName;
  size?: number;
}

const ICON_PATHS: Record<AresIconName, string[]> = {
  brain: ['M9.5 2a4.5 4.5 0 0 0-4.4 5.4A3.5 3.5 0 0 0 6 14.3V18a3 3 0 0 0 3 3h1V2h-.5Z', 'M14.5 2a4.5 4.5 0 0 1 4.4 5.4A3.5 3.5 0 0 1 18 14.3V18a3 3 0 0 1-3 3h-1V2h.5Z'],
  heart: ['M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z'],
  droplet: ['M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z'],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  wind: ['M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2', 'M9.6 4.6A2 2 0 1 1 11 8H2', 'M12.6 19.4A2 2 0 1 0 14 16H2'],
  radio: ['M4.9 19.1C1 15.2 1 8.8 4.9 4.9', 'M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5', 'M12 12h.01', 'M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5', 'M19.1 4.9C23 8.8 23 15.2 19.1 19.1'],
  sliders: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
  check: ['M20 6 9 17l-5-5'],
  alert: ['M12 9v4', 'M12 17h.01', 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z'],
  info: ['M12 16v-4', 'M12 8h.01', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'],
  clipboard: ['M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M9 2h6v4H9z'],
  plus: ['M5 12h14', 'M12 5v14'],
  history: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5', 'M12 7v5l4 2'],
  home: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  sync: ['M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5', 'M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16', 'M16 16h5v5'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  'arrow-right': ['M5 12h14', 'M12 5l7 7-7 7'],
  user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'],
};

export function AresIcon({ name, size = 18, className = '', ...props }: AresIconProps) {
  const paths = ICON_PATHS[name] ?? ICON_PATHS.info;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {paths.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}
