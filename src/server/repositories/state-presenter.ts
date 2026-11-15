import { ALGORITHM_VERSION, SCENARIOS_META, VITAL_SPECS, evaluateHealth } from '@/domain/health';
import type { GamificationState } from '@/domain/missions/mission-catalog';
import { getMissionDateKey } from '@/domain/missions/mission-date';
import { applyClinicalRestrictionsToMissions } from '@/domain/missions/mission-safety';
import { MAX_COMMS_LOG, MAX_HISTORY_DAYS } from '../storage/file-store';
import type { DbState, DbUser, HealthObservation, PublicUser, PublicUserState } from '../storage/types';

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
 * Proyecta el estado diario de misiones sin mutar el objeto persistido (seguro para rutas GET).
 */
export function projectDailyMissionsState(
  gamification: GamificationState,
  todayKey = getMissionDateKey()
): GamificationState {
  if (gamification.lastResetDate === todayKey) {
    return gamification;
  }
  return {
    ...gamification,
    lastResetDate: todayKey,
    missions: gamification.missions.map((mission) => ({
      ...mission,
      completed: mission.lastAwardedDate === todayKey,
    })),
  };
}

/**
 * Sincroniza el reinicio visual diario de misiones si cambió la fecha calendario de la misión,
 * preservando `lastAwardedDate` para impedir duplicación de XP en el mismo día.
 */
export function ensureDailyMissionsState(user: DbUser, todayKey = getMissionDateKey()): void {
  user.gamification = projectDailyMissionsState(user.gamification, todayKey);
}

/**
 * Obtiene observaciones previas excluyendo la observación vigente por `observationId` o `dateKey`,
 * evitando truncar ciegamente con `slice(0, -1)` cuando existen registros históricos fuera de orden.
 */
export function getPriorObservationsForCurrent(user: DbUser): HealthObservation[] {
  const safeObservations = user.observations ?? [];
  if (safeObservations.length === 0 || !user.currentVitals) {
    return [];
  }

  const matchingEntry = user.lastCheckinAt
    ? user.history.find((entry) => entry.timestamp === user.lastCheckinAt)
    : undefined;
  const latestEntry =
    matchingEntry ??
    [...user.history].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).at(-1);

  const currentObsId =
    latestEntry?.observationIds?.at(-1) ??
    latestEntry?.id ??
    (user.lastCheckinAt
      ? safeObservations.find((obs) => obs.capturedAt === user.lastCheckinAt)?.observationId
      : undefined);

  if (currentObsId && safeObservations.some((obs) => obs.observationId === currentObsId)) {
    return safeObservations.filter((obs) => obs.observationId !== currentObsId);
  }

  const currentDateKey =
    latestEntry?.dateKey ??
    (user.lastCheckinAt
      ? safeObservations.find((obs) => obs.capturedAt === user.lastCheckinAt)?.dateKey
      : undefined);

  if (currentDateKey) {
    return safeObservations.filter((obs) => obs.dateKey !== currentDateKey);
  }

  return safeObservations;
}

/**
 * Construye la proyección pública completa del estado de salud y gamificación de un tripulante
 * sin mutar el estado en memoria ni la persistencia.
 */
export function buildPublicUserState(db: DbState, user: DbUser): PublicUserState {
  const dailyGamification = projectDailyMissionsState(user.gamification);
  const safeObservations = user.observations ?? [];
  const evaluation = evaluateHealth(user.currentVitals ?? {}, {
    context: user.currentContext ?? undefined,
    priorObservations: getPriorObservationsForCurrent(user),
  });

  const gamification = {
    ...dailyGamification,
    missions: applyClinicalRestrictionsToMissions(dailyGamification.missions, evaluation),
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
