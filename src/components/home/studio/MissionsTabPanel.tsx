'use client';

import { useState } from 'react';
import type { HealthEvaluation } from '@/domain/health';
import { AresIcon, type AresIconName } from '@/components/ui/Icons';
import styles from './ControlsMissions.module.css';
import type { MissionItem } from '@/domain/missions/mission-catalog';
import type { PublicUserState } from '@/server/storage/types';
import { BreatheMissionCard } from './missions/BreatheMissionCard';
import { ExerciseMissionCard } from './missions/ExerciseMissionCard';
import { RestMissionCard } from './missions/RestMissionCard';

interface MissionsTabPanelProps {
  evaluation?: HealthEvaluation;
  userState: PublicUserState | null;
  missions: MissionItem[];
  completedLocalIds: string[];
  hydrationLevel?: number;
  exerciseStep?: number;
  restNightActive?: boolean;
  breathRounds?: number;
  commsSending: boolean;
  commsSentAt: string | null;
  onCompleteMission: (missionId: string) => void;
  onAdvanceExercise?: () => void;
  onToggleRest?: () => void;
  onCompleteBreathRound?: () => void;
  onOpenBreather?: () => void;
  onResetMissions: () => void;
  onPingEarth: () => void;
}

const MISSION_ICON: Record<string, AresIconName> = {
  droplet: 'droplet',
  activity: 'activity',
  moon: 'moon',
  wind: 'wind',
};

const MISSION_SHORT_TITLE: Record<string, string> = {
  hydrate: 'Hidratación',
  exercise: 'Activación 1G',
  rest: 'Cabina nocturna',
  breathe: 'Calma 0G',
};

const OVERALL_STATUS_LABELS: Record<string, string> = {
  GREEN: 'VERDE',
  YELLOW: 'AMARILLO',
  RED: 'ROJO',
  INSUFFICIENT_DATA: 'SIN DATOS',
};

const HYDRATION_STAGE_LABELS = ['Malo', 'Regular', 'Normal', 'Bien', 'Excelente'] as const;
const HYDRATION_MOOD_COLORS = ['#FF3B4E', '#F97316', '#FFB800', '#18C97E', '#18C97E'] as const;

function getMissionBadgeLabel(
  mission: MissionItem,
  isDone: boolean,
  isLocked: boolean,
  hydrationLevel: number,
): string {
  if (isLocked) return 'Pausada';
  if (isDone) return 'Lista ✓';
  if (mission.id === 'hydrate') return `${hydrationLevel}/4`;
  return 'Activar';
}

function formatCommsTime(commsSentAt: string | null): string | null {
  if (!commsSentAt) return null;
  const date = new Date(commsSentAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function HydrateTankIcon({ level }: { level: number }) {
  const clampedLevel = Math.max(0, Math.min(4, level));
  const fillScale = clampedLevel / 4;
  const meniscusTranslateY = Number(((1 - fillScale) * 74).toFixed(2));
  const moodColor = HYDRATION_MOOD_COLORS[clampedLevel];

  return (
    <svg
      className={styles.hydrateTankSvg}
      viewBox="0 0 128 128"
      fill="none"
      aria-hidden="true"
      data-hydration-level={clampedLevel}
    >
      <defs>
        <clipPath id="hydrate-tank-clip">
          <rect x="14" y="26" width="36" height="74" rx="9" />
        </clipPath>
      </defs>

      {/* Pressurized H2O Tank */}
      <rect
        x="22"
        y="16"
        width="20"
        height="8"
        rx="3"
        fill="#CBD5E1"
        stroke="#1C1917"
        strokeWidth="2.6"
      />
      <rect x="14" y="26" width="36" height="74" rx="9" fill="#1E293B" />
      <g clipPath="url(#hydrate-tank-clip)">
        <rect
          className={styles.hydrateTankLiquid}
          x="14"
          y="26"
          width="36"
          height="74"
          fill="#38BDF8"
          style={{
            transformOrigin: '32px 100px',
            transform: `scaleY(${fillScale})`,
          }}
        />
        <rect
          className={styles.hydrateTankMeniscus}
          x="14"
          y="26"
          width="36"
          height="4.5"
          fill="#BAE6FD"
          style={{
            transform: `translateY(${meniscusTranslateY}px)`,
            opacity: clampedLevel > 0 ? 1 : 0,
          }}
        />
      </g>
      <line
        x1="17"
        y1="44.5"
        x2="25"
        y2="44.5"
        stroke="#FFFDF8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <line
        x1="17"
        y1="63"
        x2="28"
        y2="63"
        stroke="#FFFDF8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <line
        x1="17"
        y1="81.5"
        x2="25"
        y2="81.5"
        stroke="#FFFDF8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <rect
        x="14"
        y="26"
        width="36"
        height="74"
        rx="9"
        stroke="#1C1917"
        strokeWidth="3"
      />

      {/* Cohesive ARES Mini-Astronaut Helmet */}
      <line
        x1="88"
        y1="40"
        x2="88"
        y2="31"
        stroke="#1C1917"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle
        cx="88"
        cy="29"
        r="3.6"
        fill={moodColor}
        stroke="#1C1917"
        strokeWidth="2.2"
      />
      <circle
        cx="88"
        cy="68"
        r="27"
        fill="#FFFDF8"
        stroke="#1C1917"
        strokeWidth="3"
      />
      <rect
        x="68"
        y="54"
        width="40"
        height="27"
        rx="12"
        fill="#2A2845"
        stroke="#1C1917"
        strokeWidth="2.6"
      />
      <path
        d="M74 59 C81 56.5, 92 56.5, 99 59"
        stroke="#5B6BFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.85"
      />

      <g
        className={styles.hydrateFaceMood}
        data-hydration-mood={HYDRATION_STAGE_LABELS[clampedLevel]}
      >
        {clampedLevel === 0 ? (
          <>
            <path
              d="M75.5 63.5 L81.5 69.5 M81.5 63.5 L75.5 69.5"
              stroke="#FFFDF8"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M94.5 63.5 L100.5 69.5 M100.5 63.5 L94.5 69.5"
              stroke="#FFFDF8"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <ellipse cx="88" cy="75" rx="4.5" ry="2.8" fill="#FF3B4E" />
          </>
        ) : clampedLevel === 1 ? (
          <>
            <line
              x1="75"
              y1="66"
              x2="82"
              y2="66"
              stroke="#FFFDF8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="94"
              y1="66"
              x2="101"
              y2="66"
              stroke="#FFFDF8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M81 75 Q88 71.5 95 75"
              stroke="#F97316"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </>
        ) : clampedLevel === 2 ? (
          <>
            <circle cx="78.5" cy="65.5" r="2.3" fill="#FFFDF8" />
            <circle cx="97.5" cy="65.5" r="2.3" fill="#FFFDF8" />
            <line
              x1="81"
              y1="74"
              x2="95"
              y2="74"
              stroke="#FFB800"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </>
        ) : clampedLevel === 3 ? (
          <>
            <circle cx="78.5" cy="65" r="2.4" fill="#FFFDF8" />
            <circle cx="97.5" cy="65" r="2.4" fill="#FFFDF8" />
            <path
              d="M80 72.5 Q88 78.5 96 72.5"
              stroke="#18C97E"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path
              d="M74.5 66.5 Q78.5 61.5 82.5 66.5"
              stroke="#FFFDF8"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M93.5 66.5 Q97.5 61.5 101.5 66.5"
              stroke="#FFFDF8"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M79 72 Q88 80 97 72"
              stroke="#18C97E"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        )}
      </g>
    </svg>
  );
}

export function MissionsTabPanel({
  evaluation,
  userState,
  missions,
  completedLocalIds,
  hydrationLevel,
  exerciseStep,
  restNightActive,
  breathRounds,
  commsSending,
  commsSentAt,
  onCompleteMission,
  onAdvanceExercise,
  onToggleRest,
  onCompleteBreathRound,
  onResetMissions,
  onPingEarth,
}: MissionsTabPanelProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  const doneCount = missions.filter(
    (mission) => mission.completed || completedLocalIds.includes(mission.id),
  ).length;
  const totalCount = missions.length;
  const allDone = totalCount > 0 && doneCount >= totalCount;

  const overallStatusCode = evaluation?.overallStatus ?? 'INSUFFICIENT_DATA';
  const overallStatusLabel =
    OVERALL_STATUS_LABELS[overallStatusCode] ?? overallStatusCode;
  const readinessScoreText =
    typeof evaluation?.readinessScore === 'number'
      ? `${evaluation.readinessScore}/100`
      : 'N/D';
  const formattedSentAt = formatCommsTime(commsSentAt);

  return (
    <section className={`right-stack missions-layout ${styles.missions}`}>
      <h2 className="sr-only">Acciones del turno</h2>

      <div className={styles.missionsToolbar}>
        <p className={styles.protocolStatus}>
          {allDone
            ? 'Jornada orbital completa'
            : `${doneCount}/${totalCount} completadas · Toca cada tarjeta`}
        </p>
        {userState ? (
          confirmingReset ? (
            <div
              className={styles.resetConfirmGroup}
              role="group"
              aria-label="Confirmar reinicio del día"
            >
              <button
                type="button"
                className={`btn-tactile ${styles.resetConfirmBtn}`}
                onClick={() => {
                  setConfirmingReset(false);
                  onResetMissions();
                }}
              >
                Confirmar reinicio
              </button>
              <button
                type="button"
                className={`btn-tactile ${styles.resetCancelBtn}`}
                onClick={() => setConfirmingReset(false)}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`btn-tactile ${styles.resetBtn}`}
              onClick={() => setConfirmingReset(true)}
            >
              <AresIcon name="sync" size={15} />
              Reiniciar día
            </button>
          )
        ) : null}
      </div>

      <div className="missions-list">
        {missions.map((mission) => {
          const isDone = mission.completed || completedLocalIds.includes(mission.id);
          const isLocked = Boolean(mission.blockedByRestriction);

          if (mission.id === 'exercise') {
            const step = isLocked
              ? 0
              : isDone
                ? 4
                : Math.max(0, Math.min(4, exerciseStep ?? 0));
            return (
              <ExerciseMissionCard
                key={mission.id}
                mission={mission}
                isDone={isDone}
                isLocked={isLocked}
                step={step}
                onAdvance={onAdvanceExercise ?? (() => onCompleteMission(mission.id))}
              />
            );
          }

          if (mission.id === 'rest') {
            const restDone = restNightActive !== undefined ? restNightActive : isDone;
            const nightActive = restNightActive !== undefined ? restNightActive : isDone;
            return (
              <RestMissionCard
                key={mission.id}
                mission={mission}
                isDone={restDone}
                isLocked={isLocked}
                nightActive={nightActive}
                onToggle={onToggleRest ?? (() => onCompleteMission(mission.id))}
              />
            );
          }

          if (mission.id === 'breathe') {
            const rounds = isDone ? 2 : Math.max(0, Math.min(2, breathRounds ?? 0));
            return (
              <BreatheMissionCard
                key={mission.id}
                mission={mission}
                isDone={isDone}
                isLocked={isLocked}
                rounds={rounds}
                onRoundComplete={
                  onCompleteBreathRound ?? (() => onCompleteMission(mission.id))
                }
              />
            );
          }

          const level =
            mission.id === 'hydrate'
              ? Math.max(0, Math.min(4, isDone ? 4 : (hydrationLevel ?? 0)))
              : 0;
          const icon = MISSION_ICON[mission.iconKey] ?? 'check';
          const iconThemeClass = styles[`icon_${mission.id}`] ?? '';
          const shortTitle = MISSION_SHORT_TITLE[mission.id] ?? mission.title;

          const cardStatusClass = isLocked
            ? styles.cardStatusLocked
            : isDone
              ? styles.cardStatusDone
              : styles.cardStatusHydrate;

          return (
            <button
              key={mission.id}
              type="button"
              id={`m-${mission.id}`}
              aria-disabled={isLocked || undefined}
              className={`mission-btn ${styles.hydrateCard}${isDone ? ' done' : ''}${isLocked ? ' locked' : ''}`}
              onClick={() => onCompleteMission(mission.id)}
            >
              <div className="mission-top">
                <div className={styles.cardHeaderMeta}>
                  <span className={styles.missionLabel}>{shortTitle}</span>
                  {mission.recommendedPriority && !isDone && !isLocked ? (
                    <span className={styles.recommendedTag}>Recomendada</span>
                  ) : null}
                </div>
                <span className="mission-xp">
                  {getMissionBadgeLabel(mission, isDone, isLocked, level)}
                </span>
              </div>

              {mission.id === 'hydrate' ? (
                <span
                  className={`${styles.missionIconWrap} ${styles.hydrateTankWrap}${isDone ? ` ${styles.hydrateTankDone}` : ''}${isLocked ? ` ${styles.iconLocked}` : ''}`}
                  aria-hidden="true"
                >
                  <HydrateTankIcon level={level} />
                </span>
              ) : (
                <span
                  className={`${styles.missionIconWrap} ${iconThemeClass}${isDone ? ` ${styles.iconDone}` : ''}${isLocked ? ` ${styles.iconLocked}` : ''}`}
                  aria-hidden="true"
                >
                  <AresIcon name={icon} size={32} />
                </span>
              )}

              <div className={styles.cardCopy}>
                {mission.id === 'hydrate' ? (
                  <>
                    <small className={`${styles.cardSub} ${cardStatusClass}`}>
                      {isLocked && mission.restrictionReason
                        ? mission.restrictionReason
                        : `Tanque ${level}/4 · Astronauta: ${HYDRATION_STAGE_LABELS[level]}`}
                    </small>
                    <div className={styles.hydratePips} aria-hidden="true">
                      {[0, 1, 2, 3].map((idx) => (
                        <span
                          key={idx}
                          className={[
                            styles.hydratePip,
                            idx < level
                              ? isDone || level >= 4
                                ? styles.hydratePipDone
                                : styles.hydratePipFilled
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        />
                      ))}
                    </div>
                    {isLocked ? (
                      <span className={`${styles.cardActionCue} ${styles.cardActionCueLocked}`}>
                        Pausada por alerta
                      </span>
                    ) : isDone || level >= 4 ? (
                      <span className={`${styles.cardActionCue} ${styles.cardActionCueDone}`}>
                        Hidratación lista ✓
                      </span>
                    ) : (
                      <span className={styles.cardActionCue}>+1 Toma</span>
                    )}
                  </>
                ) : isLocked && mission.restrictionReason ? (
                  <small className={`${styles.cardSub} ${styles.cardStatusLocked}`}>
                    {mission.restrictionReason}
                  </small>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <h2 className="sr-only">Enlace con Tierra</h2>

      <button
        type="button"
        id="btn-earth"
        disabled={commsSending}
        className={`earth-btn ${styles.earthBtn}${commsSentAt ? ' sent' : ''}`}
        data-overall-status={overallStatusCode}
        onClick={onPingEarth}
      >
        <div className={styles.earthContent}>
          <div className={styles.earthMetaRow}>
            <span className={styles.earthStatusBadge}>{overallStatusLabel}</span>
            <span className={styles.earthMetric}>{readinessScoreText}</span>
            <span className={styles.earthMetric}>{`${doneCount}/${totalCount} completadas`}</span>
          </div>
          <span className={styles.earthHeadline}>
            {commsSending
              ? 'Registrando aviso...'
              : commsSentAt
                ? 'Informe registrado'
                : 'Copiar y registrar informe'}
          </span>
          {formattedSentAt ? (
            <span className={styles.earthTimestamp}>{`Enviado · ${formattedSentAt}`}</span>
          ) : null}
        </div>
        <span className={styles.earthCtaIcon} aria-hidden="true">
          <AresIcon name={commsSentAt ? 'check' : 'radio'} size={18} />
        </span>
      </button>
    </section>
  );
}
