import type { LandingReadinessVerdict } from '@/domain/nasa/cohort-decision';

export type GravityModalPhase = 'closed' | 'descending' | 'tablet';

export const GRAVITY_DESCENT_DURATION_MS = 1800;

/**
 * Checks `prefers-reduced-motion: reduce` safely in SSR and browser environments.
 */
export function prefersReducedMotionSafe(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)')?.matches);
}

/**
 * Resolves the initial visible phase when opening the gravity reentry simulator.
 */
export function getInitialGravityOpenPhase(
  verdict: LandingReadinessVerdict,
  reducedMotion: boolean
): Exclude<GravityModalPhase, 'closed'> {
  if (reducedMotion || verdict === 'INSUFFICIENT_CARDIO_DATA') {
    return 'tablet';
  }
  return 'descending';
}

/**
 * Smoothly interpolates a numeric vital metric with bounded easeOutCubic progression.
 */
export function interpolateMetric(
  start: number | null,
  end: number | null,
  progress: number
): number | null {
  if (
    start === null ||
    end === null ||
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    return null;
  }

  const clamped = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const eased = 1 - Math.pow(1 - clamped, 3);
  const value = Math.round(start + (end - start) * eased);
  return Number.isFinite(value) ? value : null;
}

export interface GravityDescentControllerOptions<TTimer = ReturnType<typeof setTimeout>> {
  setTimer?: (callback: () => void, delayMs: number) => TTimer;
  clearTimer?: (timerId: TTimer) => void;
  durationMs?: number;
  onPhaseChange?: (phase: GravityModalPhase) => void;
}

export interface GravityDescentController {
  getPhase: () => GravityModalPhase;
  open: (verdict: LandingReadinessVerdict, reducedMotion: boolean) => GravityModalPhase;
  skip: () => GravityModalPhase;
  replay: (verdict: LandingReadinessVerdict, reducedMotion: boolean) => GravityModalPhase;
  close: () => GravityModalPhase;
  dispose: () => void;
}

/**
 * Pure state machine controller for the gravity descent animation timer.
 * Cancels any pending timer before scheduling another and guards transitions against stale callbacks.
 */
export function createGravityDescentController<TTimer = ReturnType<typeof setTimeout>>(
  options: GravityDescentControllerOptions<TTimer> = {}
): GravityDescentController {
  const setTimer =
    options.setTimer ??
    ((callback: () => void, delayMs: number) =>
      globalThis.setTimeout(callback, delayMs) as unknown as TTimer);
  const clearTimer =
    options.clearTimer ??
    ((timerId: TTimer) => {
      globalThis.clearTimeout(timerId as unknown as ReturnType<typeof setTimeout>);
    });
  const durationMs = options.durationMs ?? GRAVITY_DESCENT_DURATION_MS;
  const onPhaseChange = options.onPhaseChange;

  let phase: GravityModalPhase = 'closed';
  let activeTimer: TTimer | null = null;
  let generation = 0;

  function cancelActiveTimer(): void {
    if (activeTimer !== null) {
      clearTimer(activeTimer);
      activeTimer = null;
    }
  }

  function transitionTo(nextPhase: GravityModalPhase): void {
    if (phase !== nextPhase) {
      phase = nextPhase;
      onPhaseChange?.(nextPhase);
    }
  }

  function startPhase(
    verdict: LandingReadinessVerdict,
    reducedMotion: boolean
  ): GravityModalPhase {
    generation += 1;
    cancelActiveTimer();

    const nextPhase = getInitialGravityOpenPhase(verdict, reducedMotion);
    transitionTo(nextPhase);

    if (nextPhase === 'descending') {
      const token = generation;
      activeTimer = setTimer(() => {
        if (token !== generation || phase !== 'descending') {
          return;
        }
        activeTimer = null;
        transitionTo('tablet');
      }, durationMs);
    }

    return phase;
  }

  return {
    getPhase: () => phase,
    open: (verdict, reducedMotion) => startPhase(verdict, reducedMotion),
    replay: (verdict, reducedMotion) => startPhase(verdict, reducedMotion),
    skip: () => {
      generation += 1;
      cancelActiveTimer();
      if (phase === 'descending') {
        transitionTo('tablet');
      }
      return phase;
    },
    close: () => {
      generation += 1;
      cancelActiveTimer();
      transitionTo('closed');
      return phase;
    },
    dispose: () => {
      generation += 1;
      cancelActiveTimer();
    },
  };
}
