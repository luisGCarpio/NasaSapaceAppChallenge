import { ALGORITHM_VERSION, SCENARIOS_META, VITAL_SPECS, evaluateHealth } from '@/domain/health';
import { getMissionDateKey } from '@/domain/missions/mission-date';
import { applyClinicalRestrictionsToMissions } from '@/domain/missions/mission-safety';
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
  const safeObservations = user.observations ?? [];
  const evaluation = evaluateHealth(user.currentVitals ?? {}, {
    context: user.currentContext ?? undefined,
    priorObservations: safeObservations.slice(0, -1),
  });

  const gamification = {
    ...user.gamification,
    missions: applyClinicalRestrictionsToMissions(user.gamification.missions, evaluation),
  };

  return {
    user: toPublicUser(user),
    currentVitals: user.currentVitals,
    currentContext: user.currentContext ?? null,
    history: user.history.slice(-MAX_HISTORY_DAYS),
    observations: safeObservations,
    gamification,
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
