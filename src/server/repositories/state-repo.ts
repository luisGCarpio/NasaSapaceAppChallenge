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
  loadDb,
  saveDb,
  withDbLock,
} from '../storage/file-store';
import { attemptCheckinRemoteSync } from '../storage/remote-sync';
import type { CheckinEntry, HealthObservation, PublicUserState } from '../storage/types';
import { buildPublicUserState } from './state-presenter';

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

export function getUserStateSnapshot(userId: string): PublicUserState | null {
  const db = loadDb();
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

  const targetDateKey =
    typeof input.dateKeyOverride === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.dateKeyOverride)
      ? input.dateKeyOverride
      : getMissionDateKey(new Date());
  const submissionId =
    typeof input.clientSubmissionId === 'string' && input.clientSubmissionId.trim()
      ? input.clientSubmissionId.trim()
      : undefined;

  return withDbLock(async (db) => {
    const user = db.users[input.userId];
    if (!user) {
      return { ok: false, status: 404, error: 'Usuario no encontrado.' };
    }

    if (!Array.isArray(user.observations)) user.observations = [];

    if (submissionId) {
      const existingBySub = user.history.find((item) => item.clientSubmissionId === submissionId);
      if (existingBySub) {
        return {
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
      source: input.source || 'manual',
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
        source: input.source || 'manual',
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
        source: input.source || 'manual',
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

    await attemptCheckinRemoteSync(db, user.id, savedEntry);
    saveDb(db);

    return {
      ok: true,
      status: 200,
      consolidated,
      deduplicated: false,
      entry: savedEntry,
      evaluation,
      state: buildPublicUserState(db, user),
    };
  });
}
