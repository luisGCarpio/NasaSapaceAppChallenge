import { ALGORITHM_VERSION, SCENARIOS_META, VITAL_SPECS, evaluateHealth } from '@/domain/health';
import { getMissionDateKey } from '@/domain/missions/mission-date';
import { MAX_COMMS_LOG, MAX_HISTORY_DAYS } from '../storage/file-store';
import type { DbState, DbUser, PublicUser, PublicUserState } from '../storage/types';

export function toPublicUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/**
 * Sincroniza el reinicio visual diario de misiones si cambió la fecha calendario de la misión,
 * preservando `lastAwardedDate` para impedir duplicación de XP en el mismo día.
 */
export function ensureDailyMissionsState(user: DbUser, todayKey = getMissionDateKey()): void {
  if (user.gamification.lastResetDate !== todayKey) {
    user.gamification.missions = user.gamification.missions.map((mission) => ({
      ...mission,
      completed: mission.lastAwardedDate === todayKey,
    }));
    user.gamification.lastResetDate = todayKey;
  }
}

/**
 * Construye la proyección pública completa del estado de salud y gamificación de un tripulante.
 */
export function buildPublicUserState(db: DbState, user: DbUser): PublicUserState {
  ensureDailyMissionsState(user);
  const evaluation = evaluateHealth(user.currentVitals ?? {});

  return {
    user: toPublicUser(user),
    currentVitals: user.currentVitals,
    history: user.history.slice(-MAX_HISTORY_DAYS),
    gamification: user.gamification,
    storageMode: db.syncMeta.status === 'synced' ? 'local_with_remote_retry' : 'local_json_atomic',
    syncMeta: db.syncMeta,
    commsLog: user.commsLog.slice(-MAX_COMMS_LOG),
    lastCheckinAt: user.lastCheckinAt,
    evaluation,
    algorithmVersion: ALGORITHM_VERSION,
    vitalSpecs: VITAL_SPECS,
    scenarios: SCENARIOS_META,
  };
}
