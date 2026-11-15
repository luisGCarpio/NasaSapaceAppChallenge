import crypto from 'node:crypto';
import {
  evaluateHealth,
  normalizeContext,
  type HealthEvaluation,
  type PartialVitalValues,
} from '@/domain/health';
import { getMissionDateKey } from '@/domain/missions/mission-date';
import {
  MAX_HISTORY_DAYS,
  MAX_OBSERVATIONS_ARCHIVE,
  readDb,
  saveDb,
  withDbLock,
} from '../storage/file-store';
import { MAX_SYNC_QUEUE, attemptCheckinRemoteSync } from '../storage/remote-sync';
import type { CheckinEntry, DbState, HealthObservation, PublicUserState } from '../storage/types';
import { buildPublicUserState } from './state-presenter';

const ALLOWED_CHECKIN_SOURCES = new Set([
  'manual',
  'wearable',
  'telemetry',
  'clinical_recheck',
  'test_checkin',
  'api',
]);
const MAX_SOURCE_LENGTH = 48;

function isValidCalendarDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1970 || year > 2100) return false;
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

export type SaveCheckinResult =
  | {
      ok: true;
      status: 200;
      consolidated: boolean;
      deduplicated: boolean;
      entry: CheckinEntry;
      evaluation: HealthEvaluation;
      state: PublicUserState;
    }
  | {
      ok: false;
      status: 400 | 404 | 422;
      error: string;
      evaluation?: HealthEvaluation;
    };

export async function getUserStateSnapshot(userId: string): Promise<PublicUserState | null> {
  const db = await readDb();
  const user = db.users[userId];
  if (!user) return null;
  return buildPublicUserState(db, user);
}

export async function saveUserCheckin(input: {
  userId: string;
  rawVitals: unknown;
  rawContext?: unknown;
  isSimulation?: boolean;
  clientSubmissionId?: string;
  dateKeyOverride?: string;
  source?: string;
}): Promise<SaveCheckinResult> {
  if (input.isSimulation) {
    return {
      ok: false,
      status: 400,
      error: 'No se puede guardar un escenario simulado en el historial real del astronauta.',
    };
  }

  let targetDateKey: string;
  if (input.dateKeyOverride !== undefined) {
    if (typeof input.dateKeyOverride !== 'string' || !isValidCalendarDateKey(input.dateKeyOverride)) {
      return {
        ok: false,
        status: 400,
        error: 'La fecha dateKey proporcionada es inválida (formato YYYY-MM-DD y calendario real requerido).',
      };
    }
    targetDateKey = input.dateKeyOverride;
  } else {
    targetDateKey = getMissionDateKey(new Date());
  }

  let validatedSource = 'manual';
  if (input.source !== undefined) {
    const trimmedSource = typeof input.source === 'string' ? input.source.trim() : '';
    if (
      !trimmedSource ||
      trimmedSource.length > MAX_SOURCE_LENGTH ||
      !ALLOWED_CHECKIN_SOURCES.has(trimmedSource)
    ) {
      return {
        ok: false,
        status: 400,
        error: 'El origen de medición (source) es inválido o no pertenece al catálogo permitido.',
      };
    }
    validatedSource = trimmedSource;
  }

  const context = normalizeContext(
    input.rawContext && typeof input.rawContext === 'object' ? (input.rawContext as never) : undefined
  );
  const preCheck = evaluateHealth(input.rawVitals, { context });
  if (!preCheck.valid) {
    return {
      ok: false,
      status: 422,
      error: preCheck.errors[0] || 'Signos vitales inválidos o insuficientes.',
      evaluation: preCheck,
    };
  }

  const submissionId =
    typeof input.clientSubmissionId === 'string' && input.clientSubmissionId.trim()
      ? input.clientSubmissionId.trim()
      : undefined;

  type LocalWriteOutcome =
    | { kind: 'error'; result: SaveCheckinResult }
    | { kind: 'deduplicated'; result: SaveCheckinResult }
    | {
        kind: 'saved';
        userId: string;
        consolidated: boolean;
        entry: CheckinEntry;
        evaluation: HealthEvaluation;
        localState: PublicUserState;
        syncWorkingDb: DbState;
      };

  const lockOutcome = await withDbLock<LocalWriteOutcome>((db) => {
    const user = db.users[input.userId];
    if (!user) {
      return { kind: 'error', result: { ok: false, status: 404, error: 'Usuario no encontrado.' } };
    }

    if (!Array.isArray(user.observations)) user.observations = [];

    if (submissionId) {
      const existingBySub = user.history.find((item) => item.clientSubmissionId === submissionId);
      if (existingBySub) {
        return {
          kind: 'deduplicated',
          result: {
            ok: true,
            status: 200,
            consolidated: false,
            deduplicated: true,
            entry: existingBySub,
            evaluation: evaluateHealth(existingBySub.vitals, {
              context: existingBySub.context,
              priorObservations: user.observations.filter(
                (o) => o.clientSubmissionId !== submissionId
              ),
            }),
            state: buildPublicUserState(db, user),
          },
        };
      }
    }

    const now = new Date().toISOString();
    const evaluation = evaluateHealth(input.rawVitals, {
      context,
      priorObservations: user.observations,
      previousStatus: user.history[user.history.length - 1]?.overallStatus ?? null,
    });
    const validatedVitals = evaluation.vitals as PartialVitalValues;

    const observationId = `${user.id}-${targetDateKey}-${crypto.randomUUID().slice(0, 8)}`;
    const observation: HealthObservation = {
      observationId,
      dateKey: targetDateKey,
      capturedAt: now,
      source: validatedSource,
      ...(submissionId ? { clientSubmissionId: submissionId } : {}),
      vitals: validatedVitals,
      context: evaluation.context,
      overallStatus: evaluation.overallStatus,
      readinessScore: evaluation.readinessScore,
      coveragePct: evaluation.coverage.coveragePct,
      qualityTier: evaluation.quality.tier,
      crossConclusionId: evaluation.crossConclusionId,
    };

    user.observations.push(observation);
    if (user.observations.length > MAX_OBSERVATIONS_ARCHIVE) {
      user.observations = user.observations.slice(-MAX_OBSERVATIONS_ARCHIVE);
    }

    const existingIndex = user.history.findIndex((item) => item.dateKey === targetDateKey);
    let savedEntry: CheckinEntry;
    let consolidated = false;

    if (existingIndex >= 0) {
      consolidated = true;
      const prev = user.history[existingIndex];
      savedEntry = {
        ...prev,
        dayLabel: targetDateKey,
        timestamp: now,
        updatesCount: (prev.updatesCount || 1) + 1,
        clientSubmissionId: submissionId ?? prev.clientSubmissionId,
        vitals: validatedVitals,
        context: evaluation.context,
        coveragePct: evaluation.coverage.coveragePct,
        qualityTier: evaluation.quality.tier,
        observationIds: [...(prev.observationIds ?? [prev.id]), observationId],
        overallStatus: evaluation.overallStatus,
        readinessScore: evaluation.readinessScore,
        crossConclusionId: evaluation.crossConclusionId,
        algorithmVersion: evaluation.algorithmVersion,
        source: validatedSource,
      };
      user.history[existingIndex] = savedEntry;
    } else {
      savedEntry = {
        id: observationId,
        dateKey: targetDateKey,
        dayLabel: targetDateKey,
        timestamp: now,
        updatesCount: 1,
        ...(submissionId ? { clientSubmissionId: submissionId } : {}),
        vitals: validatedVitals,
        context: evaluation.context,
        coveragePct: evaluation.coverage.coveragePct,
        qualityTier: evaluation.quality.tier,
        observationIds: [observationId],
        overallStatus: evaluation.overallStatus,
        readinessScore: evaluation.readinessScore,
        crossConclusionId: evaluation.crossConclusionId,
        algorithmVersion: evaluation.algorithmVersion,
        source: validatedSource,
      };
      user.history.push(savedEntry);
    }

    user.history.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    if (user.history.length > MAX_HISTORY_DAYS) {
      user.history = user.history.slice(-MAX_HISTORY_DAYS);
    }

    user.currentVitals = validatedVitals;
    user.currentContext = evaluation.context;
    user.lastCheckinAt = now;

    saveDb(db);

    return {
      kind: 'saved',
      userId: user.id,
      consolidated,
      entry: savedEntry,
      evaluation,
      localState: buildPublicUserState(db, user),
      syncWorkingDb: {
        users: {},
        sessions: {},
        pendingSyncQueue: [...db.pendingSyncQueue],
        syncMeta: { ...db.syncMeta },
      },
    };
  });

  if (lockOutcome.kind !== 'saved') {
    return lockOutcome.result;
  }

  // Sincronización remota fuera del lock de escritura para no bloquear otros check-ins durante la red.
  const previousQueueIds = new Set(lockOutcome.syncWorkingDb.pendingSyncQueue.map((item) => item.id));
  await attemptCheckinRemoteSync(
    lockOutcome.syncWorkingDb,
    lockOutcome.userId,
    lockOutcome.entry,
    fetch,
    lockOutcome.evaluation
  );

  const newQueueItems = lockOutcome.syncWorkingDb.pendingSyncQueue.filter(
    (item) => !previousQueueIds.has(item.id)
  );

  const finalState = await withDbLock((freshDb) => {
    if (newQueueItems.length > 0) {
      freshDb.pendingSyncQueue.push(...newQueueItems);
      if (freshDb.pendingSyncQueue.length > MAX_SYNC_QUEUE) {
        freshDb.pendingSyncQueue = freshDb.pendingSyncQueue.slice(-MAX_SYNC_QUEUE);
      }
    }
    freshDb.syncMeta = {
      ...lockOutcome.syncWorkingDb.syncMeta,
      pendingCount: freshDb.pendingSyncQueue.length,
    };
    saveDb(freshDb);
    const freshUser = freshDb.users[lockOutcome.userId];
    return freshUser ? buildPublicUserState(freshDb, freshUser) : lockOutcome.localState;
  });

  return {
    ok: true,
    status: 200,
    consolidated: lockOutcome.consolidated,
    deduplicated: false,
    entry: lockOutcome.entry,
    evaluation: lockOutcome.evaluation,
    state: finalState,
  };
}
