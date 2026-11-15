'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import type { MissionItem } from '@/domain/missions/mission-catalog';
import { prefersReducedMotionSafe } from '../gravity-reentry-machine';
import styles from './BreatheMissionCard.module.css';

export interface BreatheMissionCardProps {
  mission: MissionItem;
  isDone: boolean;
  isLocked: boolean;
  rounds: number; // 0..2
  onRoundComplete: () => void;
}

const TOTAL_ROUNDS = 2;
const TOTAL_ARC_LENGTH = 326.73;
const INHALE_DURATION_MS = 1200;
const INHALE_FALLBACK_TICK_MS = 48;
const INHALE_FALLBACK_STEP_PCT = 4;

type StatusTone = 'locked' | 'done' | 'ready' | 'holding' | 'warn' | 'default';

function getBadgeLabel(isDone: boolean, isLocked: boolean, rounds: number): string {
  if (isLocked) return 'Pausada';
  if (isDone) return 'Lista ✓';
  return `${rounds}/${TOTAL_ROUNDS}`;
}

function getStatusCopy(params: {
  mission: MissionItem;
  isDone: boolean;
  isLocked: boolean;
  rounds: number;
  isHolding: boolean;
  readyExhale: boolean;
  releasedEarly: boolean;
}): { text: string; tone: StatusTone } {
  const { mission, isDone, isLocked, rounds, isHolding, readyExhale, releasedEarly } = params;

  if (isLocked) {
    return {
      text: mission.restrictionReason ?? 'Misión pausada por protocolo clínico.',
      tone: 'locked',
    };
  }
  if (isDone) {
    return {
      text: 'Pulso estabilizado. Mente tranquila.',
      tone: 'done',
    };
  }
  if (readyExhale) {
    return {
      text: '¡Suelta para exhalar!',
      tone: 'ready',
    };
  }
  if (isHolding) {
    return {
      text: 'Inhalando...',
      tone: 'holding',
    };
  }
  if (releasedEarly) {
    return {
      text: 'Mantén 1.2s seguido',
      tone: 'warn',
    };
  }
  if (rounds === 1) {
    return {
      text: 'Mantén 1 ronda más',
      tone: 'default',
    };
  }
  return {
    text: 'Mantén 1.2s o toca para guiar',
    tone: 'default',
  };
}

/**
 * Interactive press-and-hold breath orb card for mission `#m-breathe`.
 * Completes 2 inhale-exhale rounds directly on the button without opening a modal.
 */
export function BreatheMissionCard({
  mission,
  isDone,
  isLocked,
  rounds,
  onRoundComplete,
}: BreatheMissionCardProps) {
  const clampedRounds = Math.max(0, Math.min(TOTAL_ROUNDS, isDone ? TOTAL_ROUNDS : rounds));

  const [breathPct, setBreathPct] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [readyExhale, setReadyExhale] = useState(false);
  const [releasedEarly, setReleasedEarly] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const rafRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHoldingRef = useRef(false);
  const isGuidedAutoRef = useRef(false);
  const readyExhaleRef = useRef(false);
  const breathPctRef = useRef(0);
  const pointerTriggeredRef = useRef(false);
  const keyTriggeredRef = useRef(false);

  const clearHoldAnimation = useCallback(() => {
    if (rafRef.current !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (fallbackTimerRef.current !== null) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setReducedMotion(prefersReducedMotionSafe());
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(mql.matches);
    mql.addEventListener?.('change', handleChange);
    return () => mql.removeEventListener?.('change', handleChange);
  }, []);

  useEffect(() => {
    return () => {
      clearHoldAnimation();
    };
  }, [clearHoldAnimation]);

  useEffect(() => {
    if (isDone || isLocked) {
      clearHoldAnimation();
      isHoldingRef.current = false;
      isGuidedAutoRef.current = false;
      readyExhaleRef.current = false;
      breathPctRef.current = 0;
      setIsHolding(false);
      setReadyExhale(false);
      setReleasedEarly(false);
      setBreathPct(0);
    }
  }, [isDone, isLocked, clearHoldAnimation]);

  useEffect(() => {
    if (rounds === 0 && !isHoldingRef.current) {
      readyExhaleRef.current = false;
      breathPctRef.current = 0;
      setReadyExhale(false);
      setReleasedEarly(false);
      setBreathPct(0);
    }
  }, [rounds]);

  const runInhaleProgress = useCallback(
    (autoCompleteOnFinish: boolean) => {
      clearHoldAnimation();
      isHoldingRef.current = true;
      isGuidedAutoRef.current = autoCompleteOnFinish;
      readyExhaleRef.current = false;
      breathPctRef.current = 0;
      setIsHolding(true);
      setReadyExhale(false);
      setReleasedEarly(false);
      setBreathPct(0);

      const completeInhale = () => {
        clearHoldAnimation();
        if (autoCompleteOnFinish) {
          isHoldingRef.current = false;
          isGuidedAutoRef.current = false;
          readyExhaleRef.current = false;
          breathPctRef.current = 0;
          setIsHolding(false);
          setReadyExhale(false);
          setBreathPct(0);
          onRoundComplete();
        } else {
          readyExhaleRef.current = true;
          setReadyExhale(true);
        }
      };

      if (typeof requestAnimationFrame === 'function' && typeof performance !== 'undefined') {
        const startTime = performance.now();
        const step = (now: number) => {
          if (!isHoldingRef.current) return;
          const elapsed = now - startTime;
          const nextPct = Math.min(100, (elapsed / INHALE_DURATION_MS) * 100);
          breathPctRef.current = nextPct;
          setBreathPct(nextPct);
          if (nextPct >= 100) {
            completeInhale();
            return;
          }
          rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
      } else {
        fallbackTimerRef.current = setInterval(() => {
          const nextPct = Math.min(100, breathPctRef.current + INHALE_FALLBACK_STEP_PCT);
          breathPctRef.current = nextPct;
          setBreathPct(nextPct);
          if (nextPct >= 100) {
            completeInhale();
          }
        }, INHALE_FALLBACK_TICK_MS);
      }
    },
    [clearHoldAnimation, onRoundComplete],
  );

  const startInhale = useCallback(() => {
    if (isDone || isLocked || isHoldingRef.current) return;
    runInhaleProgress(false);
  }, [isDone, isLocked, runInhaleProgress]);

  const releaseBreath = useCallback(
    (cancelled = false) => {
      if (!isHoldingRef.current || isGuidedAutoRef.current) return;

      isHoldingRef.current = false;
      clearHoldAnimation();

      const completedInhale = !cancelled && readyExhaleRef.current;
      readyExhaleRef.current = false;
      breathPctRef.current = 0;

      setIsHolding(false);
      setReadyExhale(false);
      setBreathPct(0);

      if (completedInhale) {
        setReleasedEarly(false);
        onRoundComplete();
      } else if (!cancelled) {
        setReleasedEarly(true);
      }
    },
    [clearHoldAnimation, onRoundComplete],
  );

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (isDone || isLocked) return;
    pointerTriggeredRef.current = true;
    startInhale();
  };

  const handlePointerRelease = () => {
    releaseBreath(false);
  };

  const handlePointerCancel = () => {
    pointerTriggeredRef.current = false;
    releaseBreath(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (event.repeat || isDone || isLocked) return;
    keyTriggeredRef.current = true;
    startInhale();
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    keyTriggeredRef.current = false;
    releaseBreath(false);
  };

  const handleClickFallback = () => {
    if (pointerTriggeredRef.current) {
      pointerTriggeredRef.current = false;
      return;
    }
    if (keyTriggeredRef.current) {
      keyTriggeredRef.current = false;
      return;
    }
    if (isDone || isLocked || isHoldingRef.current) return;
    runInhaleProgress(true);
  };

  const activePct = isDone || isLocked ? 0 : breathPct;
  const orbScale = reducedMotion ? 1 : 1 + (activePct / 100) * 0.24;
  const globalPct = Math.min(1, (clampedRounds * 50 + activePct * 0.5) / 100);
  const arcDashOffset = Number((TOTAL_ARC_LENGTH * (1 - globalPct)).toFixed(2));
  const trackFillPct = isDone ? 100 : Math.round(globalPct * 100);

  const badgeLabel = getBadgeLabel(isDone, isLocked, clampedRounds);
  const statusCopy = getStatusCopy({
    mission,
    isDone,
    isLocked,
    rounds: clampedRounds,
    isHolding,
    readyExhale,
    releasedEarly,
  });

  const buttonClassName = [
    'mission-btn',
    'missionBtnHold',
    styles.breatheBtn,
    isDone ? 'done' : '',
    isLocked ? 'locked' : '',
    isHolding && !readyExhale ? styles.breatheHolding : '',
    readyExhale ? styles.breatheReady : '',
  ]
    .filter(Boolean)
    .join(' ');

  const stageClassName = [
    styles.breathStageWrap,
    isDone ? styles.breathStageDone : '',
    isLocked ? styles.breathStageLocked : '',
  ]
    .filter(Boolean)
    .join(' ');

  const statusToneClass: Record<StatusTone, string> = {
    locked: styles.statusLocked,
    done: styles.statusDone,
    ready: styles.statusReady,
    holding: styles.statusHolding,
    warn: styles.statusWarn,
    default: styles.statusDefault,
  };

  const actionCueClassName = [
    styles.actionCue,
    isLocked
      ? styles.actionCueLocked
      : isDone
        ? styles.actionCueDone
        : isHolding
          ? styles.actionCueHolding
          : '',
  ]
    .filter(Boolean)
    .join(' ');

  const actionCueLabel = isLocked
    ? 'Pausada por alerta'
    : isDone
      ? 'Calma completada ✓'
      : readyExhale
        ? 'Suelta ahora'
        : isHolding
          ? 'Mantén...'
          : 'Mantener 1.2s';

  const coreFill = isDone || readyExhale ? '#18C97E' : isHolding ? '#38BDF8' : '#5B6BFF';
  const outerHaloFill = isDone ? '#A7F3D0' : isHolding ? '#BAE6FD' : '#C7D2FE';
  const innerHaloFill = isDone ? '#6EE7B7' : isHolding ? '#7DD3FC' : '#A5B4FC';

  return (
    <button
      type="button"
      id="m-breathe"
      aria-disabled={isLocked || undefined}
      className={buttonClassName}
      data-breath-rounds={clampedRounds}
      data-breath-holding={isHolding ? 'true' : 'false'}
      data-breath-ready={readyExhale ? 'true' : 'false'}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerRelease}
      onPointerLeave={handlePointerRelease}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onClick={handleClickFallback}
      onBlur={() => releaseBreath(true)}
    >
      <div className="mission-top">
        <div className={styles.headerMeta}>
          <span className={styles.missionLabel}>Calma 0G</span>
          {mission.recommendedPriority && !isDone && !isLocked ? (
            <span className={styles.recommendedTag}>Recomendada</span>
          ) : null}
        </div>
        <span className="mission-xp">{badgeLabel}</span>
      </div>

      <span className={stageClassName} aria-hidden="true">
        <svg className={styles.breathSvg} viewBox="0 0 128 128" fill="none">
          <circle
            cx="64"
            cy="64"
            r="52"
            fill="none"
            stroke={isDone ? '#A7F3D0' : '#EFE9DC'}
            strokeWidth="7"
          />
          <circle
            id="breathArc"
            className={styles.breathArc}
            cx="64"
            cy="64"
            r="52"
            fill="none"
            stroke={isDone ? '#18C97E' : isHolding ? '#38BDF8' : '#5B6BFF'}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={TOTAL_ARC_LENGTH}
            strokeDashoffset={arcDashOffset}
            transform="rotate(-90 64 64)"
          />
          <g
            id="breathOrbGroup"
            className={styles.breathOrbGroup}
            style={reducedMotion ? undefined : { transform: `scale(${orbScale})` }}
          >
            <circle cx="64" cy="64" r="35" fill={outerHaloFill} opacity="0.82" />
            <rect
              x="36"
              y="36"
              width="56"
              height="56"
              rx="22"
              transform="rotate(22 64 64)"
              fill={innerHaloFill}
              opacity="0.68"
            />
            <circle
              cx="64"
              cy="64"
              r="21"
              fill={coreFill}
              stroke="#1C1917"
              strokeWidth="2.8"
            />
            <circle
              cx="58"
              cy="58"
              r="4.5"
              fill="#FFFDF8"
              opacity={isHolding ? '0.65' : '0.42'}
            />
          </g>
        </svg>
      </span>

      <div className={styles.cardFooter}>
        <small className={`${styles.statusCopy} ${statusToneClass[statusCopy.tone]}`}>
          {statusCopy.text}
        </small>
        <div className={styles.progressRow} aria-hidden="true">
          <div className={styles.roundDots}>
            {[0, 1].map((idx) => (
              <span
                key={idx}
                className={[
                  styles.roundDot,
                  idx < clampedRounds
                    ? isDone
                      ? styles.roundDotDone
                      : styles.roundDotFilled
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ))}
          </div>
          <div className={styles.inhaleTrack}>
            <div
              className={[
                styles.inhaleFill,
                isDone ? styles.inhaleFillDone : isHolding ? styles.inhaleFillHolding : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ width: `${trackFillPct}%` }}
            />
          </div>
        </div>
        <span className={actionCueClassName}>{actionCueLabel}</span>
      </div>
    </button>
  );
}
