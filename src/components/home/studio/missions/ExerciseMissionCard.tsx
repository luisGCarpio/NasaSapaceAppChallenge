'use client';

import { useEffect, useState } from 'react';
import type { MissionItem } from '@/domain/missions/mission-catalog';
import { prefersReducedMotionSafe } from '../gravity-reentry-machine';
import styles from './ExerciseMissionCard.module.css';

export interface ExerciseMissionCardProps {
  mission: MissionItem;
  isDone: boolean;
  isLocked: boolean;
  step: number; // 0..4
  onAdvance: () => void;
}

interface ExercisePose {
  label: string;
  shadow: string;
  legs: string;
  torso: string;
  upperArmL: string;
  forearmL: string;
  upperArmR: string;
  forearmR: string;
  barbell: string;
  cableL: string;
  cableR: string;
}

const RING_RADIUS = 56;
const RING_CIRCUMFERENCE = 351.86;

const EXERCISE_POSES: readonly ExercisePose[] = [
  {
    label: 'Listo para activar',
    shadow: 'scaleX(1)',
    legs: 'translateY(0px) scaleY(1)',
    torso: 'translateY(0px) rotate(0deg)',
    upperArmL: 'rotate(-75deg)',
    forearmL: 'rotate(105deg)',
    upperArmR: 'rotate(75deg)',
    forearmR: 'rotate(-105deg)',
    barbell: 'translateY(0px) rotate(0deg)',
    cableL: 'scaleY(1) rotate(0deg)',
    cableR: 'scaleY(1) rotate(0deg)',
  },
  {
    label: 'Brazos arriba',
    shadow: 'scaleX(0.92)',
    legs: 'translateY(0px) scaleY(1)',
    torso: 'translateY(-3px) rotate(0deg)',
    upperArmL: 'rotate(78deg)',
    forearmL: 'rotate(10deg)',
    upperArmR: 'rotate(-78deg)',
    forearmR: 'rotate(-10deg)',
    barbell: 'translateY(-37px) rotate(0deg)',
    cableL: 'scaleY(2.07) rotate(0deg)',
    cableR: 'scaleY(2.07) rotate(0deg)',
  },
  {
    label: 'Giro orbital',
    shadow: 'scaleX(0.96)',
    legs: 'translateY(0px) scaleY(1)',
    torso: 'translateY(-1px) rotate(4deg)',
    upperArmL: 'rotate(48deg)',
    forearmL: 'rotate(18deg)',
    upperArmR: 'rotate(44deg)',
    forearmR: 'rotate(-105deg)',
    barbell: 'translateY(-20px) rotate(20deg)',
    cableL: 'scaleY(1.84) rotate(1.5deg)',
    cableR: 'scaleY(1.32) rotate(-2deg)',
  },
  {
    label: 'Flexión Cero-G',
    shadow: 'scaleX(1.18)',
    legs: 'translateY(0px) scaleY(0.74)',
    torso: 'translateY(6px) rotate(0deg)',
    upperArmL: 'rotate(-68deg)',
    forearmL: 'rotate(95deg)',
    upperArmR: 'rotate(68deg)',
    forearmR: 'rotate(-95deg)',
    barbell: 'translateY(6px) rotate(0deg)',
    cableL: 'scaleY(0.83) rotate(0deg)',
    cableR: 'scaleY(0.83) rotate(0deg)',
  },
  {
    label: '¡Salto estrella!',
    shadow: 'scaleX(0.76)',
    legs: 'translateY(-5px) scaleY(1.04)',
    torso: 'translateY(-6px) rotate(0deg)',
    upperArmL: 'rotate(64deg)',
    forearmL: 'rotate(8deg)',
    upperArmR: 'rotate(-64deg)',
    forearmR: 'rotate(-8deg)',
    barbell: 'translateY(-38.5px) rotate(0deg)',
    cableL: 'scaleY(2.12) rotate(0deg)',
    cableR: 'scaleY(2.12) rotate(0deg)',
  },
] as const;

function getExerciseBadgeText(
  displayStep: number,
  isDone: boolean,
  isLocked: boolean,
): string {
  if (isLocked) return 'Pausada';
  if (isDone) return 'Lista ✓';
  return `${displayStep}/4`;
}

export function ExerciseMissionCard({
  mission,
  isDone,
  isLocked,
  step,
  onAdvance,
}: ExerciseMissionCardProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(prefersReducedMotionSafe());
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(mql.matches);
    mql.addEventListener?.('change', handleChange);
    return () => mql.removeEventListener?.('change', handleChange);
  }, []);

  const clampedStep = Math.max(0, Math.min(4, Math.round(step)));
  const displayStep = isLocked ? 0 : isDone ? 4 : clampedStep;
  const isComplete = !isLocked && (isDone || displayStep >= 4);
  const pose = EXERCISE_POSES[displayStep];
  const dashOffset = Number((RING_CIRCUMFERENCE * (1 - displayStep / 4)).toFixed(2));
  const ringStroke = isLocked ? '#64748B' : isComplete ? '#18C97E' : '#FF5A26';
  const badgeText = getExerciseBadgeText(displayStep, isDone, isLocked);

  const cardClassName = [
    'mission-btn',
    styles.exerciseCard,
    isDone ? 'done' : '',
    isLocked ? 'locked' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const stageClassName = [
    styles.ringStageWrap,
    isComplete ? styles.ringStageDone : '',
    isLocked ? styles.ringStageLocked : '',
  ]
    .filter(Boolean)
    .join(' ');

  const statusClassName = [
    styles.exerciseStatus,
    isLocked
      ? styles.exerciseStatusLocked
      : isComplete
        ? styles.exerciseStatusDone
        : '',
  ]
    .filter(Boolean)
    .join(' ');

  const actionCueClassName = [
    styles.actionCue,
    isLocked
      ? styles.actionCueLocked
      : isComplete
        ? styles.actionCueDone
        : '',
  ]
    .filter(Boolean)
    .join(' ');

  const actionCueLabel = isLocked
    ? 'Pausada por alerta'
    : isComplete
      ? 'Activación lista ✓'
      : displayStep === 0
        ? 'Iniciar rutina'
        : 'Siguiente pose';

  const statusText = isLocked
    ? mission.restrictionReason ?? 'Actividad pausada por seguridad clínica.'
    : `Anillo ${displayStep}/4 · ${pose.label}`;

  return (
    <button
      type="button"
      id="m-exercise"
      aria-disabled={isLocked || undefined}
      className={cardClassName}
      onClick={onAdvance}
    >
      <div className="mission-top">
        <div className={styles.headerMeta}>
          <span className={styles.missionLabel}>Activación 1G</span>
          {mission.recommendedPriority && !isDone && !isLocked ? (
            <span className={styles.recommendedTag}>Recomendada</span>
          ) : null}
        </div>
        <span className="mission-xp">{badgeText}</span>
      </div>

      <span className={stageClassName} aria-hidden="true">
        <svg
          className={styles.exerciseRingSvg}
          viewBox="0 0 128 128"
          fill="none"
          data-exercise-step={displayStep}
          data-exercise-pose={pose.label}
        >
          <circle
            cx="64"
            cy="64"
            r={RING_RADIUS}
            fill="none"
            stroke="#EFE9DC"
            strokeWidth="7"
          />
          <circle
            className={styles.fitnessRingArc}
            cx="64"
            cy="64"
            r={RING_RADIUS}
            fill="none"
            stroke={ringStroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 64 64)"
          />

          {/* 1G ARED Deck & Anchors */}
          <rect
            x="30"
            y="97"
            width="68"
            height="5"
            rx="2.5"
            fill="#CBD5E1"
            stroke="#1C1917"
            strokeWidth="2"
          />
          <ellipse
            className={styles.floorShadow}
            cx="64"
            cy="98"
            rx="19"
            ry="3"
            fill="rgba(28, 25, 23, 0.16)"
            style={reducedMotion ? undefined : { transform: pose.shadow }}
          />
          <circle cx="38" cy="97" r="2.6" fill="#1C1917" />
          <circle cx="90" cy="97" r="2.6" fill="#1C1917" />

          {/* Elastic ARED Tension Cables */}
          <line
            className={styles.cableL}
            x1="38"
            y1="97"
            x2="38"
            y2="62.5"
            stroke="#5B6BFF"
            strokeWidth="2"
            strokeDasharray="3 2"
            vectorEffect="non-scaling-stroke"
            style={reducedMotion ? undefined : { transform: pose.cableL }}
          />
          <line
            className={styles.cableR}
            x1="90"
            y1="97"
            x2="90"
            y2="62.5"
            stroke="#5B6BFF"
            strokeWidth="2"
            strokeDasharray="3 2"
            vectorEffect="non-scaling-stroke"
            style={reducedMotion ? undefined : { transform: pose.cableR }}
          />

          {/* Planted Legs & Boots */}
          <g
            className={styles.legsGroup}
            style={reducedMotion ? undefined : { transform: pose.legs }}
          >
            <rect
              x="54"
              y="76"
              width="8"
              height="18"
              rx="4"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="2.4"
            />
            <rect
              x="66"
              y="76"
              width="8"
              height="18"
              rx="4"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="2.4"
            />
            <rect
              x="52"
              y="90"
              width="11"
              height="7"
              rx="3.5"
              fill="#5B6BFF"
              stroke="#1C1917"
              strokeWidth="2.2"
            />
            <rect
              x="65"
              y="90"
              width="11"
              height="7"
              rx="3.5"
              fill="#5B6BFF"
              stroke="#1C1917"
              strokeWidth="2.2"
            />
          </g>

          {/* Torso + Helmet + Shoulder-Rigged Arms */}
          <g
            className={styles.torsoGroup}
            style={reducedMotion ? undefined : { transform: pose.torso }}
          >
            {/* Orange Jetpack */}
            <rect
              x="45"
              y="53"
              width="38"
              height="24"
              rx="8"
              fill="#FF5A26"
              stroke="#1C1917"
              strokeWidth="2.5"
            />
            {/* Suit Body & Belt */}
            <rect
              x="50"
              y="51"
              width="28"
              height="28"
              rx="9"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="2.5"
            />
            <rect
              x="50.5"
              y="71.5"
              width="27"
              height="5.5"
              rx="2.5"
              fill="#EFE9DC"
              stroke="#1C1917"
              strokeWidth="2"
            />
            <circle
              cx="64"
              cy="61.5"
              r="4.2"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="1.8"
            />
            <circle
              cx="64"
              cy="61.5"
              r="1.8"
              fill={isLocked ? '#FF3B4E' : isComplete ? '#18C97E' : '#FF5A26'}
            />

            {/* Helmet & Visor */}
            <line
              x1="64"
              y1="26.5"
              x2="64"
              y2="22"
              stroke="#1C1917"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle
              cx="64"
              cy="20.5"
              r="2.2"
              fill={isLocked ? '#FF3B4E' : isComplete ? '#18C97E' : '#FFB800'}
              stroke="#1C1917"
              strokeWidth="1.5"
            />
            <circle
              cx="64"
              cy="40"
              r="13.5"
              fill="#FFFDF8"
              stroke="#1C1917"
              strokeWidth="2.6"
            />
            <rect
              x="53.5"
              y="32"
              width="21"
              height="13.5"
              rx="6.5"
              fill="#2A2845"
              stroke="#1C1917"
              strokeWidth="2"
            />
            <path
              d="M56.5 34.5 C60.5 33.2, 65.5 33.2, 69.5 34.5"
              stroke="#5B6BFF"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {isLocked ? (
              <g>
                <path
                  d="M57 36.2 L60.2 39.4 M60.2 36.2 L57 39.4"
                  stroke="#FFFDF8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M67.8 36.2 L71 39.4 M71 36.2 L67.8 39.4"
                  stroke="#FFFDF8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <ellipse cx="64" cy="42.2" rx="2.4" ry="1.4" fill="#FF3B4E" />
              </g>
            ) : displayStep === 0 ? (
              <g>
                <circle cx="59" cy="37.8" r="1.4" fill="#FFFDF8" />
                <circle cx="69" cy="37.8" r="1.4" fill="#FFFDF8" />
                <line
                  x1="60.5"
                  y1="42"
                  x2="67.5"
                  y2="42"
                  stroke="#94A3B8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </g>
            ) : displayStep < 4 ? (
              <g>
                <line
                  x1="57"
                  y1="36.2"
                  x2="61"
                  y2="37.2"
                  stroke="#FFFDF8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <line
                  x1="71"
                  y1="36.2"
                  x2="67"
                  y2="37.2"
                  stroke="#FFFDF8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="59" cy="38.8" r="1.3" fill="#FFFDF8" />
                <circle cx="69" cy="38.8" r="1.3" fill="#FFFDF8" />
                <path
                  d="M60.5 41.8 Q64 43.8 67.5 41.8"
                  stroke="#FFB800"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </g>
            ) : (
              <g>
                <path
                  d="M56.8 38.4 Q59 35.6 61.2 38.4"
                  stroke="#FFFDF8"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
                <path
                  d="M66.8 38.4 Q69 35.6 71.2 38.4"
                  stroke="#FFFDF8"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
                <path
                  d="M59.5 41.2 Q64 45 68.5 41.2"
                  stroke="#18C97E"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                />
              </g>
            )}

            {/* Left 2-Bone Shoulder-Connected Arm */}
            <g
              className={styles.upperArmL}
              style={reducedMotion ? undefined : { transform: pose.upperArmL }}
            >
              <rect
                x="37"
                y="53"
                width="14"
                height="6"
                rx="3"
                fill="#FFFDF8"
                stroke="#1C1917"
                strokeWidth="2.2"
              />
              <g
                className={styles.forearmL}
                style={reducedMotion ? undefined : { transform: pose.forearmL }}
              >
                <rect
                  x="25"
                  y="53.5"
                  width="13"
                  height="5.2"
                  rx="2.6"
                  fill="#FFFDF8"
                  stroke="#1C1917"
                  strokeWidth="2.2"
                />
                <circle
                  cx="25"
                  cy="56"
                  r="3.8"
                  fill="#FFB800"
                  stroke="#1C1917"
                  strokeWidth="2"
                />
              </g>
            </g>

            {/* Right 2-Bone Shoulder-Connected Arm */}
            <g
              className={styles.upperArmR}
              style={reducedMotion ? undefined : { transform: pose.upperArmR }}
            >
              <rect
                x="77"
                y="53"
                width="14"
                height="6"
                rx="3"
                fill="#FFFDF8"
                stroke="#1C1917"
                strokeWidth="2.2"
              />
              <g
                className={styles.forearmR}
                style={reducedMotion ? undefined : { transform: pose.forearmR }}
              >
                <rect
                  x="90"
                  y="53.5"
                  width="13"
                  height="5.2"
                  rx="2.6"
                  fill="#FFFDF8"
                  stroke="#1C1917"
                  strokeWidth="2.2"
                />
                <circle
                  cx="103"
                  cy="56"
                  r="3.8"
                  fill="#FFB800"
                  stroke="#1C1917"
                  strokeWidth="2"
                />
              </g>
            </g>

            {/* Shoulder Caps */}
            <circle cx="51" cy="56" r="3.6" fill="#FFFDF8" stroke="#1C1917" strokeWidth="2" />
            <circle cx="77" cy="56" r="3.6" fill="#FFFDF8" stroke="#1C1917" strokeWidth="2" />
          </g>

          {/* ARED Barbell */}
          <g
            className={styles.barbellGroup}
            style={reducedMotion ? undefined : { transform: pose.barbell }}
          >
            <line
              x1="34"
              y1="62.5"
              x2="94"
              y2="62.5"
              stroke="#1C1917"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <rect
              x="32"
              y="56.5"
              width="5"
              height="12"
              rx="2.2"
              fill="#5B6BFF"
              stroke="#1C1917"
              strokeWidth="2"
            />
            <rect
              x="91"
              y="56.5"
              width="5"
              height="12"
              rx="2.2"
              fill="#5B6BFF"
              stroke="#1C1917"
              strokeWidth="2"
            />
          </g>
        </svg>
      </span>

      <div className={styles.cardFooter}>
        <small className={statusClassName}>{statusText}</small>
        <div className={styles.stepPips} aria-hidden="true">
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={[
                styles.stepPip,
                idx < displayStep
                  ? isComplete
                    ? styles.stepPipDone
                    : styles.stepPipActive
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          ))}
        </div>
        <span className={actionCueClassName}>{actionCueLabel}</span>
      </div>
    </button>
  );
}
