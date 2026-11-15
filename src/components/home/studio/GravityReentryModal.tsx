'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { AresIcon } from '@/components/ui/Icons';
import type {
  GravitySimulationResult,
  GravityStressMode,
  LandingReadinessVerdict,
  NasaOperationalDecision,
} from '@/domain/nasa/cohort-decision';
import {
  createGravityDescentController,
  getInitialGravityOpenPhase,
  GRAVITY_DESCENT_DURATION_MS,
  type GravityDescentController,
  type GravityModalPhase,
  prefersReducedMotionSafe,
} from './gravity-reentry-machine';

export interface GravityReentryModalProps {
  open: boolean;
  sim: GravitySimulationResult;
  decision: NasaOperationalDecision;
  stressMode: GravityStressMode;
  onChangeStressMode: (mode: GravityStressMode) => void;
  onClose: () => void;
  onPingEarth?: () => void;
  onGoToControls?: () => void;
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

interface SimpleVerdictCopy {
  className: string;
  badge: string;
  headline: string;
  actions: string[];
}

function getSimpleVerdictCopy(verdict: LandingReadinessVerdict): SimpleVerdictCopy {
  switch (verdict) {
    case 'GO_FOR_LANDING':
      return {
        className: 'verdict-go',
        badge: 'Apto para aterrizar',
        headline: 'Tu corazón soporta bien volver a la gravedad.',
        actions: ['Mantén hidratación y rutina normal.'],
      };
    case 'COUNTERMEASURE_REQUIRED_BEFORE_LANDING':
      return {
        className: 'verdict-warn',
        badge: 'Necesitas prepararte',
        headline: 'Al ponerte de pie en gravedad, tu pulso o presión quedan al límite.',
        actions: [
          'Toma agua con sales 2 horas antes.',
          'Usa prenda o medias de compresión en piernas.',
        ],
      };
    case 'PRESYNCOPE_ABORT_RISK':
      return {
        className: 'verdict-danger',
        badge: 'Riesgo de mareo o desmayo',
        headline: 'Tu presión puede caer al aterrizar o ponerte de pie.',
        actions: [
          'No camines ni te levantes sin apoyo.',
          'Aplica hidratación salina y traje anti-G.',
          'Quédate recostado y avisa a Tierra.',
        ],
      };
    case 'INSUFFICIENT_CARDIO_DATA':
    default:
      return {
        className: 'verdict-neutral',
        badge: 'Faltan datos',
        headline: 'Mide tu pulso o presión para simular el aterrizaje.',
        actions: ['Registra pulso y presión en reposo antes de simular.'],
      };
  }
}

function formatSignedValue(value: number): string {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

export function GravityReentryModal({
  open,
  sim,
  decision,
  stressMode,
  onChangeStressMode,
  onClose,
  onPingEarth,
  onGoToControls,
}: GravityReentryModalProps) {
  const [phase, setPhase] = useState<GravityModalPhase>('closed');
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => prefersReducedMotionSafe());

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const skipBtnRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const controllerRef = useRef<GravityDescentController | null>(null);
  const latestVerdictRef = useRef<LandingReadinessVerdict>(sim.verdict);
  const reducedMotionRef = useRef<boolean>(reducedMotion);
  const pointerDownOnBackdropRef = useRef(false);
  const handleCloseRef = useRef<() => void>(() => {});

  latestVerdictRef.current = sim.verdict;
  reducedMotionRef.current = reducedMotion;

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

  function handleSkip() {
    controllerRef.current?.skip();
    setPhase('tablet');
  }

  function handleReplay() {
    const reduced = reducedMotionRef.current;
    const nextPhase = controllerRef.current
      ? controllerRef.current.replay(sim.verdict, reduced)
      : getInitialGravityOpenPhase(sim.verdict, reduced);
    setPhase(nextPhase);
  }

  function handleClose() {
    pointerDownOnBackdropRef.current = false;
    controllerRef.current?.close();
    setPhase('closed');
    onClose();
  }

  handleCloseRef.current = handleClose;

  useEffect(() => {
    if (!open) {
      pointerDownOnBackdropRef.current = false;
      controllerRef.current?.close();
      setPhase('closed');
      return;
    }

    const controller = createGravityDescentController({
      durationMs: GRAVITY_DESCENT_DURATION_MS,
      onPhaseChange: (nextPhase) => {
        setPhase(nextPhase);
      },
    });
    controllerRef.current = controller;

    const initialPhase = controller.open(
      latestVerdictRef.current,
      reducedMotionRef.current
    );
    setPhase(initialPhase);

    return () => {
      controller.dispose();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [open]);

  const effectivePhase: GravityModalPhase = !open
    ? 'closed'
    : phase === 'closed'
      ? getInitialGravityOpenPhase(sim.verdict, reducedMotion)
      : phase;

  useEffect(() => {
    if (
      open &&
      effectivePhase === 'descending' &&
      (reducedMotion || sim.verdict === 'INSUFFICIENT_CARDIO_DATA')
    ) {
      controllerRef.current?.skip();
      setPhase('tablet');
    }
  }, [open, effectivePhase, reducedMotion, sim.verdict]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseRef.current();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.getAttribute('aria-hidden') !== 'true');

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
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (effectivePhase === 'descending') {
      skipBtnRef.current?.focus();
    } else if (effectivePhase === 'tablet') {
      closeBtnRef.current?.focus();
    }
  }, [open, effectivePhase]);

  if (!open || effectivePhase === 'closed') {
    return null;
  }

  const copy = getSimpleVerdictCopy(sim.verdict);
  const alreadyTilted =
    (sim.appliedDeltaHr === 0 &&
      sim.appliedDeltaSbp === 0 &&
      sim.appliedDeltaDbp === 0) ||
    sim.baselinePosture.startsWith('standing_tilt');
  const tiltedDeltaLabel = sim.baselinePosture.startsWith('standing_tilt')
    ? 'Sin cambio (ya estás de pie)'
    : 'Sin cambio (ya en prueba ortostática)';
  const hasHr = sim.currentHr !== null && sim.projectedTiltHr !== null;
  const hasFullBp =
    sim.currentSbp !== null &&
    sim.currentDbp !== null &&
    sim.projectedTiltSbp !== null &&
    sim.projectedTiltDbp !== null;
  const hasOnlySbp = !hasFullBp && sim.currentSbp !== null && sim.projectedTiltSbp !== null;
  const scenarioNote =
    sim.verdict === 'INSUFFICIENT_CARDIO_DATA'
      ? 'Mide pulso o presión para comparar Estándar vs Caso severo.'
      : alreadyTilted
        ? sim.baselinePosture.startsWith('standing_tilt')
          ? 'Ya estás de pie: no se aplica cambio extra en Estándar ni en Caso severo.'
          : 'Ya estás en prueba ortostática: se usan tus signos actuales sin cambio extra.'
        : stressMode === 'post_bedrest_median'
          ? 'Estándar: +60 bpm al pulso · +2 / 0 mmHg a la presión'
          : 'Caso severo: +69 bpm al pulso · -16 / -15 mmHg a la presión';

  const phaseAnnouncement =
    effectivePhase === 'descending'
      ? 'Nave despegando hacia gravedad 1G.'
      : 'Resultados del simulador de gravedad listos.';

  return (
    <div
      className="gravity-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gravity-modal-title"
      onPointerDown={(event) => {
        pointerDownOnBackdropRef.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        const startedOnBackdrop = pointerDownOnBackdropRef.current;
        pointerDownOnBackdropRef.current = false;
        if (startedOnBackdrop && event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div aria-live="polite" style={SR_ONLY_STYLE}>
        {phaseAnnouncement}
      </div>

      {effectivePhase === 'descending' ? (
        <div className="gravity-launch-layer" ref={dialogRef}>
          <h2 id="gravity-modal-title" style={SR_ONLY_STYLE}>
            Simulando regreso a gravedad
          </h2>

          <div className="gravity-launch-controls">
            <span className="gravity-g-pill mono">0G → 1G</span>
            <button
              ref={skipBtnRef}
              type="button"
              className="gravity-skip-btn"
              onClick={handleSkip}
            >
              Saltar
            </button>
          </div>

          <svg
            className="gravity-rocket-svg"
            viewBox="0 0 220 300"
            fill="none"
            role="img"
            aria-label="Nave espacial subiendo por la pantalla"
          >
            {/* Llamas de los propulsores */}
            <g className="rocket-flames">
              <path
                d="M72 222 L62 270 L80 250 L90 282 L102 246 L110 288 L120 246 L130 282 L140 250 L158 270 L148 222 Z"
                fill="#FF5A26"
                stroke="#1C1917"
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
              <path
                d="M82 222 L76 254 L90 240 L98 264 L110 236 L122 264 L130 240 L144 254 L138 222 Z"
                fill="#FFB800"
                stroke="#1C1917"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
            </g>

            {/* Propulsores inferiores */}
            <path
              d="M70 202 H98 L102 224 H66 Z"
              fill="#EFE9DC"
              stroke="#1C1917"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <path
              d="M122 202 H150 L154 224 H118 Z"
              fill="#EFE9DC"
              stroke="#1C1917"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />

            {/* Aletas laterales */}
            <path
              d="M66 144 C42 162, 30 186, 26 212 L68 198 Z"
              fill="#FF5A26"
              stroke="#1C1917"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <path
              d="M154 144 C178 162, 190 186, 194 212 L152 198 Z"
              fill="#FF5A26"
              stroke="#1C1917"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />

            {/* Cuerpo principal de la nave */}
            <path
              d="M110 18 C144 46, 158 106, 156 204 H64 C62 106, 76 46, 110 18 Z"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="5"
              strokeLinejoin="round"
            />

            {/* Punta y banda cálida */}
            <path
              d="M110 18 C128 33, 140 54, 146 76 H74 C80 54, 92 33, 110 18 Z"
              fill="#FF5A26"
              stroke="#1C1917"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />

            {/* Escotilla circular estilo astronauta */}
            <circle
              cx="110"
              cy="128"
              r="30"
              fill="#EFE9DC"
              stroke="#1C1917"
              strokeWidth="4.5"
            />
            <circle
              cx="110"
              cy="128"
              r="22"
              fill="#2A2845"
              stroke="#1C1917"
              strokeWidth="4"
            />
            <path
              d="M97 119 C103 113, 114 113, 121 118"
              stroke="#5B6BFF"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ) : (
        <div className={`gravity-tablet gravity-tablet-reveal ${copy.className}`} ref={dialogRef}>
          <div className="gravity-tablet-header">
            <h2
              id="gravity-modal-title"
              style={{ fontSize: '1.15rem', lineHeight: 1.25, margin: 0 }}
            >
              Regreso a gravedad (1G)
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
            <div className="gravity-mode-switch" role="group" aria-label="Escenario de simulación">
              <button
                type="button"
                className={`chip-toggle${stressMode === 'post_bedrest_median' ? ' active' : ''}`}
                aria-pressed={stressMode === 'post_bedrest_median'}
                onClick={() => onChangeStressMode('post_bedrest_median')}
              >
                Estándar
              </button>
              <button
                type="button"
                className={`chip-toggle${stressMode === 'post_bedrest_p25_vulnerable' ? ' active' : ''}`}
                aria-pressed={stressMode === 'post_bedrest_p25_vulnerable'}
                onClick={() => onChangeStressMode('post_bedrest_p25_vulnerable')}
              >
                Caso severo
              </button>
            </div>

            <p className="gravity-study-ref">{scenarioNote}</p>

            <div className={`gravity-verdict-banner ${copy.className}`}>
              <div className="gravity-verdict-head">
                <span className="gravity-verdict-dot" aria-hidden="true" />
                <strong>{copy.badge}</strong>
              </div>
              <p>{copy.headline}</p>
            </div>

            {!decision.returnToGravityReady && sim.verdict === 'GO_FOR_LANDING' ? (
              <div className="gravity-systemic-note">
                Tienes otra alerta médica activa: el retorno requiere apoyo aunque tu pulso aguante.
              </div>
            ) : null}

            <div className="gravity-metrics-grid">
              {sim.verdict === 'INSUFFICIENT_CARDIO_DATA' ? (
                <>
                  <div className="gravity-metric-card">
                    <span className="gravity-metric-label">Pulso</span>
                    <strong className="gravity-metric-value mono">—</strong>
                    <span className="gravity-metric-delta">Sin lectura</span>
                  </div>
                  <div className="gravity-metric-card">
                    <span className="gravity-metric-label">Presión</span>
                    <strong className="gravity-metric-value mono">—/— mmHg</strong>
                    {onGoToControls ? (
                      <button
                        type="button"
                        className="btn-tactile"
                        onClick={() => {
                          handleClose();
                          onGoToControls();
                        }}
                      >
                        <AresIcon name="sliders" size={16} /> Medir signos
                      </button>
                    ) : (
                      <span className="gravity-metric-delta">Sin lectura</span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="gravity-metric-card">
                    <span className="gravity-metric-label">Pulso al aterrizar</span>
                    <strong className="gravity-metric-value mono">
                      {hasHr ? `${sim.currentHr} → ${sim.projectedTiltHr} bpm` : '— bpm'}
                    </strong>
                    <span className="gravity-metric-delta">
                      {!hasHr
                        ? 'Sin lectura de pulso'
                        : alreadyTilted || sim.appliedDeltaHr === 0
                          ? tiltedDeltaLabel
                          : `${formatSignedValue(sim.appliedDeltaHr)} bpm al pararse`}
                    </span>
                  </div>

                  <div className="gravity-metric-card">
                    <span className="gravity-metric-label">Presión al aterrizar</span>
                    <strong className="gravity-metric-value mono">
                      {hasFullBp
                        ? `${sim.currentSbp}/${sim.currentDbp} → ${sim.projectedTiltSbp}/${sim.projectedTiltDbp} mmHg`
                        : hasOnlySbp
                          ? `${sim.currentSbp} → ${sim.projectedTiltSbp} mmHg`
                          : '—/— mmHg'}
                    </strong>
                    <span className="gravity-metric-delta">
                      {!hasFullBp && !hasOnlySbp
                        ? 'Sin lectura de presión'
                        : alreadyTilted
                          ? tiltedDeltaLabel
                          : hasOnlySbp
                            ? `${formatSignedValue(sim.appliedDeltaSbp)} mmHg (sistólica)`
                            : `${formatSignedValue(sim.appliedDeltaSbp)} / ${formatSignedValue(sim.appliedDeltaDbp)} mmHg`}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="gravity-countermeasures">
              <strong>Qué hacer</strong>
              <ul>
                {copy.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
              {sim.verdict === 'PRESYNCOPE_ABORT_RISK' && onPingEarth ? (
                <button type="button" className="btn-tactile" onClick={onPingEarth}>
                  <AresIcon name="radio" size={16} /> Avisar a Tierra
                </button>
              ) : null}
            </div>

            <p className="gravity-study-ref">Referencia NASA MR001G · {sim.pairedSessionsCount} pruebas</p>
          </div>

          <div className="gravity-tablet-footer">
            {sim.verdict !== 'INSUFFICIENT_CARDIO_DATA' && !reducedMotion ? (
              <button
                type="button"
                className="nasa-modal-trigger"
                onClick={handleReplay}
              >
                <AresIcon name="sync" size={15} /> Repetir
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
