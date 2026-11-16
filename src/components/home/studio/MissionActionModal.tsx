'use client';

import { useEffect, useRef, useState } from 'react';
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

import { MissionSceneGraphic } from './MissionSceneGraphic';
import { SR_ONLY_STYLE, BREATHE_RING_CIRCUMFERENCE, getBreathOrbScale, isElementFocusable, getFocusableElements, restoreFocusSafely } from './mission-modal-utils';

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
