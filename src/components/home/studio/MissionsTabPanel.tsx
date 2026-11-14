'use client';

import type { HealthEvaluation } from '@/domain/health';
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

const MISSION_ICON: Record<string, string> = {
  droplet: '💧',
  activity: '🏃',
  moon: '😴',
  wind: '🧘',
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
    <section className="right-stack">
      <div className="card">
        <div className="group-head" style={{ marginBottom: 10 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            🛡️ Misiones de Hoy
          </h2>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="val-pill">Nv. {level} · {xpProgress}/{XP_PER_LEVEL} XP</span>
            <span className="val-pill">🔥 Racha {streak}d</span>
            {userState ? (
              <button type="button" className="btn-tactile" style={{ padding: '4px 10px', fontSize: '0.72rem' }} onClick={onResetMissions}>
                Reiniciar día
              </button>
            ) : null}
          </div>
        </div>

        <p style={{ fontSize: '0.76rem', color: 'var(--ink-muted)', marginBottom: 10, fontWeight: 600 }}>
          {userState
            ? 'Cada misión suma XP real (máx. 1 vez por día y misión). Si existe alerta clínica, ARES bloquea el ejercicio intenso.'
            : 'Vista previa segura: inicia sesión en Controles para guardar tus XP y racha diarios en tu bitácora.'}
        </p>

        <div className="missions-list">
          {missions.map((mission) => {
            const isDone = mission.completed || completedLocalIds.includes(mission.id);
            const isLocked = Boolean(mission.blockedByRestriction);
            const icon = MISSION_ICON[mission.iconKey] ?? '✅';

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
                  <span>
                    {icon} {mission.title}
                  </span>
                  <span className="mission-xp">
                    {isLocked ? 'BLOQUEADA' : isDone ? '✓ Lista' : `+${mission.xpReward} XP`}
                  </span>
                </div>
                {isLocked && mission.restrictionReason ? (
                  <small style={{ color: '#991B1B', fontWeight: 700, fontSize: '0.72rem' }}>
                    ⚠️ {mission.restrictionReason}
                  </small>
                ) : mission.recommendedPriority ? (
                  <small style={{ color: 'var(--periwinkle)', fontWeight: 800, fontSize: '0.72rem' }}>
                    ★ Prioritaria según tu evaluación clínica actual
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
            📡 Comunicación a Control en Tierra
          </h2>
          <span className="val-pill">{evaluation.overallStatus}</span>
        </div>

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
              ? '✓ Aviso copiado y registrado en bitácora'
              : '📡 Avisar estado a Tierra (Copiar y registrar)'}
        </button>

        <p style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', marginTop: 8, fontWeight: 600 }}>
          Prototipo honesto: copia el parte estructurado al portapapeles y, si estás autenticado, lo guarda en tu historial local sin simular enlace NASA en vivo.
        </p>

        {userState && userState.commsLog.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: '0.73rem', fontWeight: 800, marginBottom: 6 }}>Últimos avisos registrados:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {userState.commsLog.slice(0, 4).map((entry) => (
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
