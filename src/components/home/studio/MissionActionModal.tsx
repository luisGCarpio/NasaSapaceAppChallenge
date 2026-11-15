'use client';

import { type CSSProperties, type RefObject, useEffect, useRef, useState } from 'react';
import { AresIcon } from '@/components/ui/Icons';
import {
  createMissionSceneController,
  getBreathPhaseLabel,
  getInitialMissionModalPhase,
  getMissionSceneCopy,
  getMissionSceneDurationMs,
  type MissionActionId,
  type MissionSceneController,
  type MissionSceneCopyContext,
  type MissionSceneModalPhase,
  type MissionSceneStateVariant,
  prefersReducedMotionSafe,
} from './mission-scene-machine';

export interface MissionActionModalProps {
  open: boolean;
  actionId: MissionActionId | null;
  variant?: MissionSceneStateVariant;
  copyContext?: MissionSceneCopyContext;
  commsSending?: boolean;
  onRetryComms?: () => void;
  onClose: () => void;
  onAnimatingComplete?: (actionId: MissionActionId) => void;
  onGoToControls?: () => void;
  onOpenBreatherFromBlocked?: () => void;
}

const SR_ONLY_STYLE: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const BREATHE_RING_RADIUS = 76;
const BREATHE_RING_CIRCUMFERENCE = 2 * Math.PI * BREATHE_RING_RADIUS;

function getBreathOrbScale(progress: number): number {
  if (progress < 0.34) {
    const t = progress / 0.34;
    return 0.78 + 0.34 * t;
  }
  if (progress < 0.62) {
    return 1.12;
  }
  const t = Math.min(1, (progress - 0.62) / 0.38);
  return 1.12 - 0.34 * t;
}

function isElementFocusable(el: HTMLElement): boolean {
  return (
    el.isConnected &&
    el.getAttribute('aria-hidden') !== 'true' &&
    !el.hasAttribute('disabled') &&
    el.getAttribute('aria-disabled') !== 'true' &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== 'hidden'
  );
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([aria-disabled="true"]), [href]:not([aria-disabled="true"]), input:not([disabled]):not([aria-disabled="true"]), select:not([disabled]):not([aria-disabled="true"]), textarea:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-disabled="true"])'
    )
  ).filter(isElementFocusable);
}

function restoreFocusSafely(prev: HTMLElement | null): void {
  if (prev && isElementFocusable(prev)) {
    prev.focus();
    return;
  }
  const mainContent = document.getElementById('main-content');
  const visibleHeading = Array.from(document.querySelectorAll<HTMLElement>('h1, h2')).find(
    (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
  );
  const fallback = mainContent ?? visibleHeading ?? null;
  if (fallback) {
    if (!fallback.hasAttribute('tabindex')) {
      fallback.setAttribute('tabindex', '-1');
    }
    fallback.focus({ preventScroll: true });
  }
}

function MissionSceneGraphic({
  actionId,
  breathLabel,
  breatheRingRef,
  breatheOrbRef,
}: {
  actionId: MissionActionId;
  breathLabel: string;
  breatheRingRef: RefObject<SVGCircleElement | null>;
  breatheOrbRef: RefObject<SVGGElement | null>;
}) {
  switch (actionId) {
    case 'hydrate':
      return (
        <svg
          className="mission-scene-svg mission-scene-hydrate"
          viewBox="0 0 240 280"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="mission-hydrate-tank-clip">
              <rect x="66" y="64" width="108" height="164" rx="22" />
            </clipPath>
          </defs>

          {/* Válvula superior del tanque */}
          <rect
            x="92"
            y="24"
            width="56"
            height="18"
            rx="7"
            fill="#FF5A26"
            stroke="#1C1917"
            strokeWidth="4.5"
          />
          <rect
            x="104"
            y="42"
            width="32"
            height="14"
            rx="4"
            fill="#FFB800"
            stroke="#1C1917"
            strokeWidth="4"
          />

          {/* Carcasa exterior */}
          <rect
            x="56"
            y="54"
            width="128"
            height="184"
            rx="28"
            fill="#EFE9DC"
            stroke="#1C1917"
            strokeWidth="5"
          />
          <rect
            x="66"
            y="64"
            width="108"
            height="164"
            rx="22"
            fill="#2A2845"
          />

          {/* Líquido animado y burbujas */}
          <g clipPath="url(#mission-hydrate-tank-clip)">
            <g className="scene-hydrate-liquid">
              <path
                d="M62 72 Q92 60 120 72 T178 72 V234 H62 Z"
                fill="#38BDF8"
                stroke="#1C1917"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <path
                d="M62 128 H178 V234 H62 Z"
                fill="#5B6BFF"
                opacity="0.35"
              />
              <rect
                x="78"
                y="92"
                width="10"
                height="112"
                rx="5"
                fill="#FFFDF8"
                opacity="0.45"
              />
            </g>

            <circle
              className="scene-hydrate-bubble"
              cx="98"
              cy="194"
              r="7"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="2.5"
            />
            <circle
              className="scene-hydrate-bubble"
              cx="142"
              cy="176"
              r="9"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="2.5"
            />
            <circle
              className="scene-hydrate-bubble"
              cx="118"
              cy="146"
              r="5.5"
              fill="#EFE9DC"
              stroke="#1C1917"
              strokeWidth="2.5"
            />
            <circle
              className="scene-hydrate-bubble"
              cx="148"
              cy="122"
              r="5"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="2"
            />
          </g>

          {/* Borde interior del visor y marcas de medida */}
          <rect
            x="66"
            y="64"
            width="108"
            height="164"
            rx="22"
            stroke="#1C1917"
            strokeWidth="4.5"
          />
          <line x1="66" y1="106" x2="84" y2="106" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />
          <line x1="66" y1="146" x2="90" y2="146" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />
          <line x1="66" y1="186" x2="84" y2="186" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />

          {/* Base del tanque */}
          <rect
            x="76"
            y="238"
            width="88"
            height="16"
            rx="8"
            fill="#FFB800"
            stroke="#1C1917"
            strokeWidth="4.5"
          />
        </svg>
      );

    case 'exercise':
      return (
        <svg
          className="mission-scene-svg mission-scene-exercise"
          viewBox="0 0 260 260"
          fill="none"
          aria-hidden="true"
        >
          {/* Plataforma ARED y anclajes de polea (y=204..228) */}
          <path
            d="M22 214 H204 L212 228 H14 Z"
            fill="#2A2845"
            stroke="#1C1917"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <rect
            x="26"
            y="204"
            width="174"
            height="12"
            rx="5"
            fill="#EFE9DC"
            stroke="#1C1917"
            strokeWidth="4"
          />

          {/* Piernas y botas firmes sobre la plataforma (y=204) */}
          <rect
            x="92"
            y="148"
            width="16"
            height="48"
            rx="7"
            fill="#FFFDF8"
            stroke="#1C1917"
            strokeWidth="3.5"
          />
          <rect
            x="120"
            y="148"
            width="16"
            height="48"
            rx="7"
            fill="#FFFDF8"
            stroke="#1C1917"
            strokeWidth="3.5"
          />
          <rect
            x="88"
            y="191"
            width="22"
            height="13"
            rx="6"
            fill="#5B6BFF"
            stroke="#1C1917"
            strokeWidth="3.5"
          />
          <rect
            x="118"
            y="191"
            width="22"
            height="13"
            rx="6"
            fill="#5B6BFF"
            stroke="#1C1917"
            strokeWidth="3.5"
          />

          {/* Mini-astronauta ARES ejecutando sentadilla y press controlado */}
          <g className="scene-exercise-astronaut">
            {/* Mochila naranja */}
            <rect
              x="74"
              y="108"
              width="80"
              height="52"
              rx="14"
              fill="#FF5A26"
              stroke="#1C1917"
              strokeWidth="4"
            />
            {/* Torso y cinturón */}
            <rect
              x="82"
              y="106"
              width="64"
              height="58"
              rx="18"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="4"
            />
            <rect
              x="84"
              y="146"
              width="60"
              height="10"
              rx="5"
              fill="#EFE9DC"
              stroke="#1C1917"
              strokeWidth="3"
            />
            <circle cx="114" cy="129" r="9" fill="#EFE9DC" stroke="#1C1917" strokeWidth="3" />
            <circle cx="114" cy="129" r="4.5" fill="#18C97E" />

            {/* Brazos articulados hacia la barra */}
            <rect
              x="64"
              y="110"
              width="26"
              height="14"
              rx="7"
              transform="rotate(14 64 110)"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="3.5"
            />
            <rect
              x="138"
              y="116"
              width="26"
              height="14"
              rx="7"
              transform="rotate(-14 138 116)"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="3.5"
            />

            {/* Casco, antena y visor con ojos enfocados */}
            <line
              x1="114"
              y1="44"
              x2="114"
              y2="35"
              stroke="#1C1917"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle
              cx="114"
              cy="34"
              r="5"
              fill="#18C97E"
              stroke="#1C1917"
              strokeWidth="2.8"
            />
            <circle
              cx="114"
              cy="74"
              r="30"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="4"
            />
            <rect
              x="91"
              y="57"
              width="46"
              height="34"
              rx="15"
              fill="#2A2845"
              stroke="#1C1917"
              strokeWidth="3.5"
            />
            <path
              d="M98 64 C106 60, 120 60, 128 64"
              stroke="#5B6BFF"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.7"
            />
            <circle cx="104" cy="73" r="3" fill="#FFFDF8" />
            <circle cx="124" cy="73" r="3" fill="#FFFDF8" />
            <line
              x1="99"
              y1="67"
              x2="108"
              y2="69"
              stroke="#FFFDF8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="129"
              y1="67"
              x2="120"
              y2="69"
              stroke="#FFFDF8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M107 82 H121"
              stroke="#18C97E"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>

          {/* Barra ARED, pistones telescópicos y guantes dorados */}
          <g className="scene-exercise-bar">
            <rect
              x="41.5"
              y="114"
              width="5"
              height="52"
              rx="2.5"
              fill="#CBD5E1"
              stroke="#1C1917"
              strokeWidth="2.5"
            />
            <rect
              x="181.5"
              y="114"
              width="5"
              height="52"
              rx="2.5"
              fill="#CBD5E1"
              stroke="#1C1917"
              strokeWidth="2.5"
            />
            <rect
              x="40"
              y="108"
              width="148"
              height="10"
              rx="5"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="3.5"
            />
            <rect
              x="34"
              y="100"
              width="18"
              height="26"
              rx="6"
              fill="#FF5A26"
              stroke="#1C1917"
              strokeWidth="3.5"
            />
            <rect
              x="176"
              y="100"
              width="18"
              height="26"
              rx="6"
              fill="#FF5A26"
              stroke="#1C1917"
              strokeWidth="3.5"
            />
            <circle
              cx="65"
              cy="113"
              r="8.5"
              fill="#FFB800"
              stroke="#1C1917"
              strokeWidth="3.2"
            />
            <circle
              cx="163"
              cy="113"
              r="8.5"
              fill="#FFB800"
              stroke="#1C1917"
              strokeWidth="3.2"
            />
          </g>

          {/* Cilindros exteriores y poleas fijas en la cubierta */}
          <rect
            x="39"
            y="130"
            width="10"
            height="66"
            rx="4"
            fill="#2A2845"
            stroke="#1C1917"
            strokeWidth="3.5"
          />
          <rect
            x="179"
            y="130"
            width="10"
            height="66"
            rx="4"
            fill="#2A2845"
            stroke="#1C1917"
            strokeWidth="3.5"
          />
          <rect
            x="36"
            y="192"
            width="16"
            height="14"
            rx="4"
            fill="#5B6BFF"
            stroke="#1C1917"
            strokeWidth="3.5"
          />
          <circle
            cx="44"
            cy="197"
            r="4.5"
            fill="#FFB800"
            stroke="#1C1917"
            strokeWidth="2.5"
          />
          <rect
            x="176"
            y="192"
            width="16"
            height="14"
            rx="4"
            fill="#5B6BFF"
            stroke="#1C1917"
            strokeWidth="3.5"
          />
          <circle
            cx="184"
            cy="197"
            r="4.5"
            fill="#FFB800"
            stroke="#1C1917"
            strokeWidth="2.5"
          />

          {/* Medidor vertical de carga 1G (0G -> 1G) */}
          <g className="scene-exercise-1g-light">
            <rect
              x="213"
              y="24"
              width="34"
              height="22"
              rx="8"
              fill="#18C97E"
              stroke="#1C1917"
              strokeWidth="3.5"
            />
            <text
              x="230"
              y="39"
              textAnchor="middle"
              fill="#1C1917"
              fontSize="11"
              fontWeight="900"
              fontFamily="monospace"
            >
              1G
            </text>
          </g>
          <rect
            x="218"
            y="54"
            width="24"
            height="142"
            rx="10"
            fill="#2A2845"
            stroke="#1C1917"
            strokeWidth="4"
          />
          <rect x="224" y="64" width="12" height="122" rx="6" fill="#1C1917" />
          <rect
            className="scene-exercise-meter-fill"
            x="224"
            y="64"
            width="12"
            height="122"
            rx="6"
            fill="#18C97E"
          />
          <rect
            x="216"
            y="202"
            width="28"
            height="18"
            rx="6"
            fill="#EFE9DC"
            stroke="#1C1917"
            strokeWidth="2.5"
          />
          <text
            x="230"
            y="215"
            textAnchor="middle"
            fill="#1C1917"
            fontSize="10"
            fontWeight="800"
            fontFamily="monospace"
          >
            0G
          </text>
        </svg>
      );

    case 'rest':
      return (
        <svg
          className="mission-scene-svg mission-scene-rest"
          viewBox="0 0 280 240"
          fill="none"
          aria-hidden="true"
        >
          {/* Halo nocturno de cabina */}
          <rect
            x="16"
            y="20"
            width="248"
            height="196"
            rx="32"
            fill="#2A2845"
            stroke="#1C1917"
            strokeWidth="5"
          />

          {/* Trayectoria orbital */}
          <path
            d="M38 172 Q140 42 242 172"
            stroke="#5B6BFF"
            strokeWidth="3.5"
            strokeDasharray="8 8"
            strokeLinecap="round"
          />

          {/* Horizonte orbital inferior */}
          <path
            d="M18 184 Q140 154 262 184 V200 C262 210 254 214 242 214 H38 C26 214 18 210 18 200 Z"
            fill="#5B6BFF"
            opacity="0.35"
          />

          {/* Estrellas destellando */}
          <path
            className="scene-rest-star"
            d="M66 56 L70 66 L80 70 L70 74 L66 84 L62 74 L52 70 L62 66 Z"
            fill="#FFB800"
            stroke="#1C1917"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            className="scene-rest-star"
            d="M214 52 L217 60 L225 63 L217 66 L214 74 L211 66 L203 63 L211 60 Z"
            fill="#FFFDF8"
            stroke="#1C1917"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle className="scene-rest-star" cx="106" cy="48" r="4.5" fill="#FFFDF8" />
          <circle className="scene-rest-star" cx="180" cy="76" r="4" fill="#FFB800" />
          <circle className="scene-rest-star" cx="226" cy="120" r="3.5" fill="#FFFDF8" />

          {/* Luna creciente cruzando en arco */}
          <g className="scene-rest-moon">
            <path
              d="M148 70 A34 34 0 1 0 174 128 A26 26 0 1 1 148 70 Z"
              fill="#FFB800"
              stroke="#1C1917"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <circle cx="132" cy="108" r="4" fill="#EFE9DC" stroke="#1C1917" strokeWidth="2" />
            <circle cx="144" cy="122" r="3" fill="#EFE9DC" stroke="#1C1917" strokeWidth="2" />
          </g>
        </svg>
      );

    case 'breathe': {
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

    case 'comms':
      return (
        <svg
          className="mission-scene-svg mission-scene-comms"
          viewBox="0 0 280 240"
          fill="none"
          aria-hidden="true"
        >
          {/* Tierra en la esquina inferior derecha */}
          <path
            d="M168 220 A76 76 0 0 1 258 148 V220 Z"
            fill="#5B6BFF"
            stroke="#1C1917"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M196 220 C198 196, 214 184, 232 184 C242 184, 250 176, 256 168 V220 Z"
            fill="#38BDF8"
            stroke="#1C1917"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <circle
            cx="224"
            cy="192"
            r="7"
            fill="#FFB800"
            stroke="#1C1917"
            strokeWidth="3"
          />

          {/* 3 ondas concéntricas emitidas hacia Tierra */}
          <path
            className="scene-comms-wave"
            d="M124 98 A28 28 0 0 1 102 132"
            stroke="#FFB800"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            className="scene-comms-wave"
            d="M148 106 A52 52 0 0 1 114 156"
            stroke="#FF5A26"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            className="scene-comms-wave"
            d="M174 114 A76 76 0 0 1 128 182"
            stroke="#38BDF8"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Satélite / antena parabólica */}
          <g className="scene-comms-dish">
            {/* Paneles solares */}
            <rect
              x="26"
              y="46"
              width="38"
              height="22"
              rx="5"
              transform="rotate(-24 26 46)"
              fill="#5B6BFF"
              stroke="#1C1917"
              strokeWidth="4"
            />
            <rect
              x="92"
              y="18"
              width="38"
              height="22"
              rx="5"
              transform="rotate(-24 92 18)"
              fill="#5B6BFF"
              stroke="#1C1917"
              strokeWidth="4"
            />
            {/* Cuerpo satélite */}
            <rect
              x="60"
              y="42"
              width="34"
              height="34"
              rx="8"
              transform="rotate(-24 60 42)"
              fill="#EFE9DC"
              stroke="#1C1917"
              strokeWidth="4.5"
            />
            {/* Plato parabólico */}
            <path
              d="M54 94 C72 114, 108 106, 118 80 L76 62 Z"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <line
              x1="92"
              y1="82"
              x2="106"
              y2="98"
              stroke="#1C1917"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle
              cx="108"
              cy="100"
              r="7"
              fill="#FF5A26"
              stroke="#1C1917"
              strokeWidth="3.5"
            />
          </g>
        </svg>
      );
  }
}

export function MissionActionModal({
  open,
  actionId,
  variant = 'normal',
  copyContext,
  commsSending,
  onRetryComms,
  onClose,
  onAnimatingComplete,
  onGoToControls,
  onOpenBreatherFromBlocked,
}: MissionActionModalProps) {
  const sceneKey = open && actionId ? `${actionId}:${variant}` : 'closed';

  const [phaseState, setPhaseState] = useState<{
    key: string;
    phase: MissionSceneModalPhase;
  }>({ key: 'closed', phase: 'closed' });
  const [sceneRunId, setSceneRunId] = useState(0);
  const [breathLabel, setBreathLabel] = useState<string>(() => getBreathPhaseLabel(0));
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => prefersReducedMotionSafe());

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const skipBtnRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const breatheRingRef = useRef<SVGCircleElement | null>(null);
  const breatheOrbRef = useRef<SVGGElement | null>(null);
  const lastBreathLabelRef = useRef<string>(getBreathPhaseLabel(0));
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const completedOnceRef = useRef(false);
  const controllerRef = useRef<MissionSceneController | null>(null);
  const reducedMotionRef = useRef<boolean>(reducedMotion);
  const pointerDownOnBackdropRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onAnimatingCompleteRef = useRef(onAnimatingComplete);

  reducedMotionRef.current = reducedMotion;
  onCloseRef.current = onClose;
  onAnimatingCompleteRef.current = onAnimatingComplete;

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mediaQuery) return;
    setReducedMotion(Boolean(mediaQuery.matches));

    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(Boolean(event.matches));
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);
      return () => {
        mediaQuery.removeListener(handleChange);
      };
    }
  }, []);

  function resetBreathLabel() {
    const initial = getBreathPhaseLabel(0);
    lastBreathLabelRef.current = initial;
    setBreathLabel(initial);
  }

  function handleSkip() {
    controllerRef.current?.skip();
    if (actionId) {
      setPhaseState({ key: sceneKey, phase: 'tablet' });
    }
  }

  function handleReplay() {
    if (!actionId) return;
    const reduced = reducedMotionRef.current;
    resetBreathLabel();
    setSceneRunId((prev) => prev + 1);
    const nextPhase = controllerRef.current
      ? controllerRef.current.replay(actionId, variant, reduced)
      : getInitialMissionModalPhase(variant, reduced);
    setPhaseState({ key: sceneKey, phase: nextPhase });
  }

  function handleClose() {
    pointerDownOnBackdropRef.current = false;
    controllerRef.current?.close();
    setPhaseState({ key: 'closed', phase: 'closed' });
    onCloseRef.current();
  }

  useEffect(() => {
    if (!open || !actionId) {
      pointerDownOnBackdropRef.current = false;
      controllerRef.current?.close();
      setPhaseState({ key: 'closed', phase: 'closed' });
      return;
    }

    const activeActionId = actionId;
    const activeSceneKey = `${activeActionId}:${variant}`;
    completedOnceRef.current = false;

    const notifyCompletedOnce = () => {
      if (completedOnceRef.current || variant !== 'normal') return;
      completedOnceRef.current = true;
      onAnimatingCompleteRef.current?.(activeActionId);
    };

    const controller = createMissionSceneController({
      getDurationMs: getMissionSceneDurationMs,
      onPhaseChange: (nextPhase) => {
        setPhaseState({ key: activeSceneKey, phase: nextPhase });
        if (nextPhase === 'tablet') {
          notifyCompletedOnce();
        }
      },
    });
    controllerRef.current = controller;

    resetBreathLabel();
    const initialPhase = controller.open(
      activeActionId,
      variant,
      reducedMotionRef.current
    );
    setPhaseState({ key: activeSceneKey, phase: initialPhase });

    return () => {
      controller.dispose();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [open, actionId, variant]);

  const storedPhase = phaseState.key === sceneKey ? phaseState.phase : 'closed';
  const effectivePhase: MissionSceneModalPhase =
    !open || !actionId
      ? 'closed'
      : storedPhase === 'closed'
        ? getInitialMissionModalPhase(variant, reducedMotion)
        : storedPhase;

  const isVisible = open && actionId !== null && effectivePhase !== 'closed';

  useEffect(() => {
    if (isVisible && reducedMotion && effectivePhase === 'animating') {
      if (controllerRef.current) {
        controllerRef.current.skip();
      } else if (actionId) {
        setPhaseState({ key: sceneKey, phase: 'tablet' });
      }
    }
  }, [isVisible, reducedMotion, effectivePhase, actionId, sceneKey]);

  useEffect(() => {
    if (!isVisible) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        pointerDownOnBackdropRef.current = false;
        controllerRef.current?.close();
        setPhaseState({ key: 'closed', phase: 'closed' });
        onCloseRef.current();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusables = getFocusableElements(dialogRef.current);

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (!dialogRef.current.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      const prev = previousFocusRef.current;
      previousFocusRef.current = null;
      restoreFocusSafely(prev);
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    if (effectivePhase === 'animating') {
      skipBtnRef.current?.focus();
      return;
    }
    if (effectivePhase === 'tablet') {
      // Defer focus shift slightly so polite aria-live tablet announcement is not swallowed.
      const focusTimer = window.setTimeout(() => {
        if (closeBtnRef.current && isElementFocusable(closeBtnRef.current)) {
          closeBtnRef.current.focus();
        }
      }, 100);
      return () => {
        window.clearTimeout(focusTimer);
      };
    }
  }, [isVisible, effectivePhase, sceneKey, sceneRunId]);

  useEffect(() => {
    if (
      !isVisible ||
      actionId !== 'breathe' ||
      effectivePhase !== 'animating' ||
      reducedMotion
    ) {
      resetBreathLabel();
      return;
    }

    const durationMs = getMissionSceneDurationMs('breathe');
    const startedAt = Date.now();
    let rafId: number | null = null;
    let cancelled = false;

    const applyFrame = (progress: number) => {
      if (breatheRingRef.current) {
        const dashOffset = BREATHE_RING_CIRCUMFERENCE * (1 - progress);
        breatheRingRef.current.style.strokeDashoffset = String(dashOffset);
      }
      if (breatheOrbRef.current) {
        breatheOrbRef.current.style.transform = `scale(${getBreathOrbScale(progress).toFixed(3)})`;
      }
      const nextLabel = getBreathPhaseLabel(progress);
      if (nextLabel !== lastBreathLabelRef.current) {
        lastBreathLabelRef.current = nextLabel;
        setBreathLabel(nextLabel);
      }
    };

    const tick = () => {
      if (cancelled) return;
      const elapsed = Math.max(0, Date.now() - startedAt);
      const nextProgress = Math.min(1, elapsed / durationMs);
      applyFrame(nextProgress);
      if (nextProgress < 1 && typeof window.requestAnimationFrame === 'function') {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    applyFrame(0);
    if (typeof window.requestAnimationFrame === 'function') {
      rafId = window.requestAnimationFrame(tick);
    }

    return () => {
      cancelled = true;
      if (rafId !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isVisible, actionId, effectivePhase, reducedMotion, sceneRunId]);

  if (!isVisible || !actionId) {
    return null;
  }

  const effectiveCopyContext: MissionSceneCopyContext | undefined =
    commsSending !== undefined ? { ...copyContext, commsSending } : copyContext;
  const copy = getMissionSceneCopy(actionId, variant, effectiveCopyContext);
  const isCommsError = actionId === 'comms' && Boolean(effectiveCopyContext?.commsError);
  const isCommsSending = actionId === 'comms' && Boolean(effectiveCopyContext?.commsSending);
  const phaseAnnouncement =
    effectivePhase === 'animating' ? copy.announcementAnimating : copy.announcementTablet;
  const overlayClassName = `gravity-modal-overlay mission-scene-overlay scene-${actionId}`;
  const showBlockedExerciseActions =
    actionId === 'exercise' &&
    variant === 'blocked' &&
    Boolean(onGoToControls || onOpenBreatherFromBlocked);

  return (
    <div
      className={overlayClassName}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-action-modal-title"
      onPointerDown={(event) => {
        pointerDownOnBackdropRef.current =
          effectivePhase === 'tablet' && event.target === event.currentTarget;
      }}
      onClick={(event) => {
        const startedOnBackdrop = pointerDownOnBackdropRef.current;
        pointerDownOnBackdropRef.current = false;
        if (
          effectivePhase === 'tablet' &&
          startedOnBackdrop &&
          event.target === event.currentTarget
        ) {
          handleClose();
        }
      }}
    >
      <div aria-live="polite" aria-atomic="true" style={SR_ONLY_STYLE}>
        {phaseAnnouncement}
      </div>

      {effectivePhase === 'animating' ? (
        <div className="gravity-launch-layer" ref={dialogRef}>
          <h2 id="mission-action-modal-title" style={SR_ONLY_STYLE}>
            {copy.modalTitle}
          </h2>

          <div className="gravity-launch-controls">
            <span className="gravity-g-pill mono">{copy.pillText}</span>
            <button
              ref={skipBtnRef}
              type="button"
              className="gravity-skip-btn"
              onClick={handleSkip}
            >
              Saltar
            </button>
          </div>

          <MissionSceneGraphic
            key={`${actionId}-${sceneRunId}`}
            actionId={actionId}
            breathLabel={breathLabel}
            breatheRingRef={breatheRingRef}
            breatheOrbRef={breatheOrbRef}
          />
        </div>
      ) : (
        <div
          className={`gravity-tablet gravity-tablet-reveal ${copy.verdictClassName}`}
          ref={dialogRef}
        >
          <div className="gravity-tablet-header">
            <h2
              id="mission-action-modal-title"
              style={{ fontSize: '1.15rem', lineHeight: 1.25, margin: 0 }}
            >
              {copy.modalTitle}
            </h2>
            <button
              type="button"
              className="gravity-modal-close"
              aria-label="Cerrar"
              onClick={handleClose}
            >
              <AresIcon name="close" size={18} />
            </button>
          </div>

          <div className="gravity-tablet-body">
            <div className={`gravity-verdict-banner ${copy.verdictClassName}`}>
              <div className="gravity-verdict-head">
                <span className="gravity-verdict-dot" aria-hidden="true" />
                <strong>{copy.badge}</strong>
              </div>
              <p>{copy.headline}</p>
            </div>

            <div className="gravity-metrics-grid">
              {copy.metrics.map((metric) => (
                <div key={metric.label} className="gravity-metric-card">
                  <span className="gravity-metric-label">{metric.label}</span>
                  <strong className="gravity-metric-value mono">{metric.value}</strong>
                  <span className="gravity-metric-delta">{metric.delta}</span>
                </div>
              ))}
            </div>

            <div className="gravity-countermeasures">
              <strong>{copy.actionsTitle}</strong>
              <ul>
                {copy.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>

              {showBlockedExerciseActions ? (
                <div className="mission-tablet-blocked-actions">
                  {onGoToControls ? (
                    <button
                      type="button"
                      className="btn-tactile"
                      onClick={() => {
                        handleClose();
                        onGoToControls();
                      }}
                    >
                      <AresIcon name="sliders" size={16} /> Ir a Controles
                    </button>
                  ) : null}
                  {onOpenBreatherFromBlocked ? (
                    <button
                      type="button"
                      className="btn-tactile"
                      onClick={onOpenBreatherFromBlocked}
                    >
                      <AresIcon name="wind" size={16} /> Hacer pausa de respiración
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="gravity-tablet-footer">
            {isCommsError ? (
              <button
                type="button"
                className="nasa-modal-trigger"
                disabled={isCommsSending}
                onClick={() => {
                  if (onRetryComms) {
                    onRetryComms();
                  } else {
                    handleReplay();
                  }
                }}
              >
                <AresIcon name="sync" size={15} /> Reintentar envío
              </button>
            ) : variant !== 'blocked' && !reducedMotion ? (
              <button
                type="button"
                className="nasa-modal-trigger"
                onClick={handleReplay}
              >
                <AresIcon name="sync" size={15} /> {copy.replayLabel}
              </button>
            ) : (
              <span />
            )}
            <button ref={closeBtnRef} type="button" className="btn-tactile" onClick={handleClose}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
