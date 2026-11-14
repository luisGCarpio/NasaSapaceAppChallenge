import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AresProvider } from '@/context/AresContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'A.R.E.S. Pulse — Monitor Lúdico de Salud Espacial',
  description:
    'Chequeo Vivo del Astronauta • Motor Contextual v3.0.0 y Validación con Datos Reales NASA OSDR/NLSP',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Space+Mono:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AresProvider>{children}</AresProvider>
      </body>
    </html>
  );
}
