'use client';

import type { MissionItem } from '@/domain/missions/mission-catalog';
import styles from './RestMissionCard.module.css';

export interface RestMissionCardProps {
  mission: MissionItem;
  isDone: boolean;
  isLocked: boolean;
  nightActive: boolean;
  onToggle: () => void;
}

export function RestMissionCard({
  mission,
  isDone,
  isLocked,
  nightActive,
  onToggle,
}: RestMissionCardProps) {
  const isNight = !isLocked && (nightActive || isDone);
  const badgeLabel = isLocked ? 'Pausada' : isNight ? 'Lista ✓' : 'Día';
  const switchLabel = isLocked
    ? 'Protocolo pausado'
    : isNight
      ? 'Modo Noche Activo ✓'
      : 'Activar Modo Noche';
  const subtitle = isLocked && mission.restrictionReason
    ? mission.restrictionReason
    : isNight
      ? 'Cabina atenuada. Listo para descanso profundo.'
      : 'Atenúa la estación para proteger tu reloj biológico.';

  const cardClassName = [
    'mission-btn',
    styles.restCard,
    isDone ? 'done' : '',
    isLocked ? 'locked' : '',
    isNight ? `night-active ${styles.nightActive}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const stageClassName = [
    styles.visualStage,
    isLocked ? styles.visualStageLocked : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      id="m-rest"
      aria-disabled={isLocked || undefined}
      aria-pressed={isLocked ? undefined : isNight}
      className={cardClassName}
      onClick={onToggle}
    >
      <div className="mission-top">
        <div className={styles.headerMeta}>
          <span className={styles.missionLabel}>Cabina nocturna</span>
          {mission.recommendedPriority && !isNight && !isLocked ? (
            <span className={styles.recommendedTag}>Recomendada</span>
          ) : null}
        </div>
        <span className="mission-xp">{badgeLabel}</span>
      </div>

      <div className={stageClassName} aria-hidden="true">
        <svg
          className={styles.portholeSvg}
          viewBox="0 0 128 128"
          fill="none"
          data-night-active={isNight ? 'true' : 'false'}
        >
          <defs>
            <clipPath id="rest-porthole-clip">
              <circle cx="64" cy="64" r="48.5" />
            </clipPath>
          </defs>

          {/* Exterior porthole sky */}
          <circle
            className={styles.portholeSky}
            cx="64"
            cy="64"
            r="50"
            fill={isNight ? '#191636' : '#BAE6FD'}
            stroke="#1C1917"
            strokeWidth="4"
            data-porthole-sky={isNight ? 'night' : 'day'}
          />

          <g clipPath="url(#rest-porthole-clip)">
            {/* Twinkling stars (visible in night mode) */}
            <g className={styles.nightStars} data-night-stars={isNight ? 'visible' : 'hidden'}>
              <circle className={styles.twinkle} cx="40" cy="42" r="2.5" fill="#FFF" />
              <circle
                className={`${styles.twinkle} ${styles.starDelay1}`}
                cx="84"
                cy="38"
                r="2"
                fill="#FFF"
              />
              <circle
                className={`${styles.twinkle} ${styles.starDelay2}`}
                cx="46"
                cy="82"
                r="2"
                fill="#FFF"
              />
              <circle
                className={`${styles.twinkle} ${styles.starDelay3}`}
                cx="88"
                cy="76"
                r="2.6"
                fill="#FFB800"
              />
            </g>

            {/* Sun orb (sets when night mode activates) */}
            <circle
              className={styles.sunOrb}
              cx="64"
              cy="58"
              r="18"
              fill="#FFB800"
              stroke="#1C1917"
              strokeWidth="3"
              data-sun-orb={isNight ? 'hidden' : 'visible'}
            />

            {/* Crescent moon orb (enters in night mode) */}
            <g className={styles.moonOrb} data-moon-orb={isNight ? 'visible' : 'hidden'}>
              <path
                d="M72 41 A18 18 0 1 0 86 67 A14 14 0 1 1 72 41 Z"
                fill="#FFE066"
                stroke="#1C1917"
                strokeWidth="2.5"
              />
            </g>

            {/* Floating Zzz when night mode is active */}
            <text
              className={styles.zzzFloat}
              x="36"
              y="68"
              fontWeight="700"
              fontSize="16"
              fill="#FFF"
            >
              Z
            </text>
            <text
              className={`${styles.zzzFloat} ${styles.zzzDelay}`}
              x="51"
              y="55"
              fontWeight="700"
              fontSize="12"
              fill="#7DD3FC"
            >
              z
            </text>
          </g>

          {/* Metal porthole frame with 4 rivets */}
          <circle cx="64" cy="64" r="50" fill="none" stroke="#1C1917" strokeWidth="5" />
          <circle cx="64" cy="14" r="2.5" fill="#FFF" />
          <circle cx="64" cy="114" r="2.5" fill="#FFF" />
          <circle cx="14" cy="64" r="2.5" fill="#FFF" />
          <circle cx="114" cy="64" r="2.5" fill="#FFF" />
        </svg>
      </div>

      <div className={styles.restBody}>
        <small className={isLocked ? styles.lockedNote : styles.missionSub}>{subtitle}</small>
        <span
          className={`${styles.sleepSwitch}${isNight ? ` ${styles.sleepSwitchOn}` : ''}${isLocked ? ` ${styles.sleepSwitchLocked}` : ''}`}
        >
          <span className={styles.switchKnob} aria-hidden="true">
            {isNight ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="4.5" />
                <line x1="12" y1="2" x2="12" y2="4.5" />
                <line x1="12" y1="19.5" x2="12" y2="22" />
                <line x1="2" y1="12" x2="4.5" y2="12" />
                <line x1="19.5" y1="12" x2="22" y2="12" />
                <line x1="4.9" y1="4.9" x2="6.7" y2="6.7" />
                <line x1="17.3" y1="17.3" x2="19.1" y2="19.1" />
                <line x1="4.9" y1="19.1" x2="6.7" y2="17.3" />
                <line x1="17.3" y1="6.7" x2="19.1" y2="4.9" />
              </svg>
            )}
          </span>
          <span className={styles.switchLabel}>{switchLabel}</span>
        </span>
      </div>
    </button>
  );
}
