'use client';

import type { HealthEvaluation } from '@/domain/health';
import { AresIcon, type AresIconName } from '@/components/ui/Icons';
import styles from './ControlsMissions.module.css';
import { XP_PER_LEVEL, type MissionItem } from '@/domain/missions/mission-catalog';
import type { PublicUserState } from '@/server/storage/types';

interface MissionsTabPanelProps {
  evaluation: HealthEvaluation;
  userState: PublicUserState | null;
  missions: MissionItem[];
  completedLocalIds: string[];
  commsSending: boolean;
  commsSentAt: string | null;
  onCompleteMission: (missionId: string) => void;
  onOpenBreather: () => void;
  onResetMissions: () => void;
  onPingEarth: () => void;
}

const MISSION_ICON: Record<string, AresIconName> = {
  droplet: 'droplet',
  activity: 'activity',
  moon: 'moon',
  wind: 'wind',
};

export function MissionsTabPanel({
  evaluation,
  userState,
  missions,
  completedLocalIds,
  commsSending,
  commsSentAt,
  onCompleteMission,
  onOpenBreather,
  onResetMissions,
  onPingEarth,
}: MissionsTabPanelProps) {
  const gamification = userState?.gamification;
  const xp = gamification?.xp ?? 0;
  const level = gamification?.level ?? 1;
  const xpProgress = gamification?.xpProgressInLevel ?? xp % XP_PER_LEVEL;
  const streak = gamification?.streak ?? 0;

  return (
    <section className={`right-stack missions-layout ${styles.missions}`}>
      <div className="card">
        <div className="group-head" style={{ marginBottom: 10 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            Misiones de hoy
          </h2>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="val-pill">Nv. {level} · {xpProgress}/{XP_PER_LEVEL} XP</span>
            <span className="val-pill">Racha {streak} días</span>
            {userState ? (
              <button type="button" className="btn-tactile"  onClick={onResetMissions}>
                Reiniciar día
              </button>
            ) : null}
          </div>
        </div>

        <div className="missions-list">
          {missions.map((mission) => {
            const isDone = mission.completed || completedLocalIds.includes(mission.id);
            const isLocked = Boolean(mission.blockedByRestriction);
            const icon = MISSION_ICON[mission.iconKey] ?? 'check';

            return (
              <button
                key={mission.id}
                type="button"
                id={`m-${mission.id}`}
                disabled={isLocked}
                className={`mission-btn${isDone ? ' done' : ''}${isLocked ? ' locked' : ''}`}
                onClick={() => {
                  if (mission.id === 'breathe') {
                    onOpenBreather();
                  } else {
                    onCompleteMission(mission.id);
                  }
                }}
              >
                <div className="mission-top">
                  <span className={styles.missionTitle}>
                    <AresIcon name={icon} size={21} /> {mission.title}
                  </span>
                  <span className="mission-xp">
                    {isLocked ? 'Pausada' : isDone ? 'Lista' : `+${mission.xpReward} XP`}
                  </span>
                </div>
                {isLocked && mission.restrictionReason ? (
                  <small style={{ color: '#991B1B', fontWeight: 700, fontSize: '0.875rem' }}>
                    {mission.restrictionReason}
                  </small>
                ) : mission.recommendedPriority ? (
                  <small style={{ color: 'var(--periwinkle-dark)', fontWeight: 800, fontSize: '0.875rem' }}>
                    Recomendada
                  </small>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="group-head" style={{ marginBottom: 10 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            Comunicación
          </h2>
          <span className="val-pill">{evaluation.overallStatus}</span>
        </div>

        <details className={styles.reportDetails}>
          <summary>Ver informe</summary>
        <pre
          style={{
            background: 'var(--surface-alt)',
            border: '2px solid var(--ink)',
            borderRadius: 12,
            padding: 12,
            fontSize: '0.76rem',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-mono)',
            marginBottom: 12,
          }}
        >
          {evaluation.commsMessage}
        </pre>

        </details>

        <button
          type="button"
          id="btn-earth"
          disabled={commsSending}
          className={`earth-btn${commsSentAt ? ' sent' : ''}`}
          onClick={onPingEarth}
        >
          {commsSending
            ? 'Registrando aviso...'
            : commsSentAt
              ? 'Informe registrado'
              : 'Copiar y registrar informe'}
        </button>

        <p className={styles.caption}>Se copia al portapapeles y se guarda en este navegador.</p>

        {userState && userState.commsLog.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <p className={styles.caption}>Últimos informes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...userState.commsLog].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 4).map((entry) => (
                <div key={entry.id} className="trace-box" style={{ marginTop: 0 }}>
                  <span className="mono">{entry.timestamp.slice(0, 16).replace('T', ' ')}</span> ·{' '}
                  <strong>{entry.overallStatus}</strong> ({entry.readinessScore ?? 'N/D'}/100) ·{' '}
                  {entry.copiedToClipboard ? 'Portapapeles OK' : 'Guardado local'}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
