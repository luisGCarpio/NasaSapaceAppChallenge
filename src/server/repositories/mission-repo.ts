import crypto from 'node:crypto';
import { STATUS, evaluateHealth, type HealthStatus } from '@/domain/health';
import { XP_PER_LEVEL } from '@/domain/missions/mission-catalog';
import { computeNextStreak, getMissionDateKey } from '@/domain/missions/mission-date';
import { MAX_COMMS_LOG, saveDb, withDbLock } from '../storage/file-store';
import type { CommsLogEntry, PublicUserState } from '../storage/types';
import {
  buildPublicUserState,
  ensureDailyMissionsState,
  getPriorObservationsForCurrent,
} from './state-presenter';

const VALID_COMMS_STATUSES = new Set<HealthStatus>([
  STATUS.GREEN,
  STATUS.YELLOW,
  STATUS.RED,
  STATUS.INSUFFICIENT_DATA,
]);
const MAX_COMMS_MESSAGE_LENGTH = 4000;

export type CompleteMissionResult =
  | { ok: true; status: 200; awardedXp: number; alreadyAwardedToday: boolean; state: PublicUserState }
  | { ok: false; status: 400 | 404; error: string };

export async function completeUserMission(userId: string, missionId: string): Promise<CompleteMissionResult> {
  if (!missionId || typeof missionId !== 'string') {
    return { ok: false, status: 400, error: 'Se requiere el identificador de misión.' };
  }

  return withDbLock((db) => {
    const user = db.users[userId];
    if (!user) return { ok: false, status: 404, error: 'Usuario no encontrado.' };

    const todayKey = getMissionDateKey();
    ensureDailyMissionsState(user, todayKey);

    const mission = user.gamification.missions.find((item) => item.id === missionId);
    if (!mission) {
      return { ok: false, status: 400, error: `Misión desconocida: ${missionId}` };
    }

    if (mission.id === 'exercise' && user.currentVitals) {
      const currentEval = evaluateHealth(user.currentVitals, {
        context: user.currentContext ?? undefined,
        priorObservations: getPriorObservationsForCurrent(user),
      });
      if (currentEval.clinicalRestrictions.restrictStrenuousExercise) {
        return {
          ok: false,
          status: 400,
          error: `Ejercicio restringido por alerta clínica: ${currentEval.clinicalRestrictions.reasons.join(' ')}`,
        };
      }
    }

    mission.completed = true;
    if (mission.lastAwardedDate === todayKey) {
      saveDb(db);
      return {
        ok: true,
        status: 200,
        awardedXp: 0,
        alreadyAwardedToday: true,
        state: buildPublicUserState(db, user),
      };
    }

    mission.lastAwardedDate = todayKey;
    user.gamification.xp += mission.xpReward;
    user.gamification.level = Math.floor(user.gamification.xp / XP_PER_LEVEL) + 1;
    user.gamification.xpProgressInLevel = user.gamification.xp % XP_PER_LEVEL;

    const nextStreak = computeNextStreak(
      user.gamification.streak,
      user.gamification.lastStreakDate,
      todayKey
    );
    user.gamification.streak = nextStreak.streak;
    user.gamification.lastStreakDate = nextStreak.lastStreakDate;

    saveDb(db);
    return {
      ok: true,
      status: 200,
      awardedXp: mission.xpReward,
      alreadyAwardedToday: false,
      state: buildPublicUserState(db, user),
    };
  });
}

export async function resetUserMissions(
  userId: string
): Promise<{ ok: true; status: 200; state: PublicUserState } | { ok: false; status: 404; error: string }> {
  return withDbLock((db) => {
    const user = db.users[userId];
    if (!user) return { ok: false, status: 404, error: 'Usuario no encontrado.' };

    const todayKey = getMissionDateKey();
    user.gamification.missions = user.gamification.missions.map((mission) => ({
      ...mission,
      completed: false,
    }));
    user.gamification.lastResetDate = todayKey;

    saveDb(db);
    return { ok: true, status: 200, state: buildPublicUserState(db, user) };
  });
}

export async function recordUserCommsLog(input: {
  userId: string;
  message: string;
  overallStatus: HealthStatus;
  readinessScore: number | null;
  copiedToClipboard: boolean;
}): Promise<
  | { ok: true; status: 200; entry: CommsLogEntry; commsLog: CommsLogEntry[]; state: PublicUserState }
  | { ok: false; status: 400 | 404; error: string }
> {
  if (!input.message || typeof input.message !== 'string' || !input.message.trim()) {
    return { ok: false, status: 400, error: 'El mensaje de reporte es obligatorio.' };
  }
  const trimmedMessage = input.message.trim();
  if (trimmedMessage.length > MAX_COMMS_MESSAGE_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `El mensaje de reporte no puede exceder ${MAX_COMMS_MESSAGE_LENGTH} caracteres.`,
    };
  }
  if (!VALID_COMMS_STATUSES.has(input.overallStatus)) {
    return {
      ok: false,
      status: 400,
      error: 'overallStatus inválido. Valores permitidos: GREEN, YELLOW, RED, INSUFFICIENT_DATA.',
    };
  }
  if (
    input.readinessScore !== null &&
    (typeof input.readinessScore !== 'number' ||
      !Number.isFinite(input.readinessScore) ||
      input.readinessScore < 0 ||
      input.readinessScore > 100)
  ) {
    return {
      ok: false,
      status: 400,
      error: 'readinessScore debe ser null o un número finito entre 0 y 100.',
    };
  }

  return withDbLock((db) => {
    const user = db.users[input.userId];
    if (!user) return { ok: false, status: 404, error: 'Usuario no encontrado.' };

    const entry: CommsLogEntry = {
      id: `comms_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      overallStatus: input.overallStatus,
      readinessScore: input.readinessScore,
      message: trimmedMessage,
      copiedToClipboard: input.copiedToClipboard === true,
    };

    user.commsLog.push(entry);
    if (user.commsLog.length > MAX_COMMS_LOG) {
      user.commsLog = user.commsLog.slice(-MAX_COMMS_LOG);
    }

    saveDb(db);
    return {
      ok: true,
      status: 200,
      entry,
      commsLog: user.commsLog,
      state: buildPublicUserState(db, user),
    };
  });
}
