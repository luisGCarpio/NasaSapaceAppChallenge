import type { Metadata } from 'next';
import { Fredoka, Plus_Jakarta_Sans, Space_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { AresProvider } from '@/context/AresContext';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-sans',
});

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-display',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'A.R.E.S. Pulse — Monitor Lúdico de Salud Espacial',
  description:
    'Chequeo Vivo del Astronauta • Motor Contextual v3.0.0 y Validación con Datos Reales NASA OSDR/NLSP',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className={`${plusJakartaSans.className} ${plusJakartaSans.variable} ${fredoka.variable} ${spaceMono.variable}`}
    >
      <body>
        <a href="#main-content" className="skip-link">
          Saltar al contenido
        </a>
        <AresProvider>{children}</AresProvider>
      </body>
    </html>
  );
}
