import type { RefObject } from 'react';
import { BREATHE_RING_RADIUS, BREATHE_RING_CIRCUMFERENCE } from './mission-modal-utils';

export function BreatheScene({ breathLabel, breatheRingRef, breatheOrbRef }: { breathLabel: string; breatheRingRef: RefObject<SVGCircleElement | null>; breatheOrbRef: RefObject<SVGGElement | null> }) {
      return (
        <div className="scene-breathe-wrap">
          <svg
            className="mission-scene-svg mission-scene-breathe"
            viewBox="0 0 240 240"
            fill="none"
            aria-hidden="true"
          >
            {/* Marco de cabina */}
            <circle
              cx="120"
              cy="120"
              r="102"
              fill="#2A2845"
              stroke="#1C1917"
              strokeWidth="5"
            />
            <circle cx="52" cy="52" r="5" fill="#EFE9DC" stroke="#1C1917" strokeWidth="2.5" />
            <circle cx="188" cy="52" r="5" fill="#EFE9DC" stroke="#1C1917" strokeWidth="2.5" />
            <circle cx="52" cy="188" r="5" fill="#EFE9DC" stroke="#1C1917" strokeWidth="2.5" />
            <circle cx="188" cy="188" r="5" fill="#EFE9DC" stroke="#1C1917" strokeWidth="2.5" />

            {/* Pista y anillo de progreso */}
            <circle
              className="scene-breathe-ring-track"
              cx="120"
              cy="120"
              r={BREATHE_RING_RADIUS}
              stroke="#EFE9DC"
              strokeOpacity="0.28"
              strokeWidth="12"
            />
            <circle
              ref={breatheRingRef}
              className="scene-breathe-ring-progress"
              cx="120"
              cy="120"
              r={BREATHE_RING_RADIUS}
              stroke="#38BDF8"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={BREATHE_RING_CIRCUMFERENCE}
              strokeDashoffset={BREATHE_RING_CIRCUMFERENCE}
              transform="rotate(-90 120 120)"
            />

            {/* Orbe central sincronizado con el ciclo */}
            <g ref={breatheOrbRef} className="scene-breathe-orb">
              <circle
                cx="120"
                cy="120"
                r="48"
                fill="#5B6BFF"
                stroke="#1C1917"
                strokeWidth="4.5"
              />
              <circle
                cx="120"
                cy="120"
                r="32"
                fill="#38BDF8"
                stroke="#1C1917"
                strokeWidth="3.5"
              />
              <circle
                cx="111"
                cy="111"
                r="11"
                fill="#FFFDF8"
                opacity="0.85"
              />
            </g>
          </svg>
          <p className="scene-breathe-phase-label" aria-live="polite" aria-atomic="true">
            {breathLabel}
          </p>
        </div>
      );
}
