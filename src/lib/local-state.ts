import { ALGORITHM_VERSION, SCENARIOS_META, VITAL_SPECS, evaluateHealth, normalizeContext } from '@/domain/health';
import { createDefaultMissions, createInitialGamification, XP_PER_LEVEL, type GamificationState, type MissionItem } from '@/domain/missions/mission-catalog';
import { computeNextStreak, getMissionDateKey } from '@/domain/missions/mission-date';
import { applyClinicalRestrictionsToMissions } from '@/domain/missions/mission-safety';
import type { PublicUserState, CheckinEntry, HealthObservation, CommsLogEntry } from '@/server/storage/types';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import type { HealthStatus, PartialVitalValues } from '@/domain/health';

const KEY = 'ares-pulse-local-v1';
const MAX_OBSERVATIONS = 180;
const MAX_HISTORY_DAYS = 60;
const MAX_COMMS_LOG = 40;

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function generateSafeId(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function createEmptyLocalState(): PublicUserState {
  return {
    user: { id: 'local', username: 'local', email: '', name: 'Tripulante', role: 'Bitácora personal' },
    currentVitals: null,
    currentContext: null,
    history: [],
    observations: [],
    commsLog: [],
    lastCheckinAt: null,
    gamification: createInitialGamification(),
    storageMode: 'local_json_atomic',
    syncMeta: {
      status: 'local_only',
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastHttpStatus: null,
      lastError: null,
      pendingCount: 0,
    },
    evaluation: evaluateHealth({}),
    algorithmVersion: ALGORITHM_VERSION,
    vitalSpecs: VITAL_SPECS,
    scenarios: SCENARIOS_META,
  };
}

function sanitizeMissions(raw: unknown, fallback: MissionItem[]): MissionItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const valid = raw.filter(
    (item): item is MissionItem =>
      isPlainObject(item) && typeof item.id === 'string' && typeof item.title === 'string'
  );
  if (valid.length === 0) return fallback;
  return valid.map((m) => ({
    ...m,
    xpReward: typeof m.xpReward === 'number' && Number.isFinite(m.xpReward) ? m.xpReward : 25,
    completed: Boolean(m.completed),
    lastAwardedDate: typeof m.lastAwardedDate === 'string' ? m.lastAwardedDate : null,
  }));
}

function sanitizeGamification(raw: unknown): GamificationState {
  const base = createInitialGamification();
  if (!isPlainObject(raw)) return base;
  const xp = typeof raw.xp === 'number' && Number.isFinite(raw.xp) && raw.xp >= 0 ? raw.xp : 0;
  const streak = typeof raw.streak === 'number' && Number.isFinite(raw.streak) && raw.streak >= 0 ? raw.streak : 0;
  return {
    xp,
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    xpForNextLevel: XP_PER_LEVEL,
    xpProgressInLevel: xp % XP_PER_LEVEL,
    streak,
    lastStreakDate: typeof raw.lastStreakDate === 'string' ? raw.lastStreakDate : null,
    lastResetDate: typeof raw.lastResetDate === 'string' ? raw.lastResetDate : null,
    missions: sanitizeMissions(raw.missions, createDefaultMissions()),
  };
}

function parseAndSanitizeState(raw: string | null): { state: PublicUserState; wasCorrupt: boolean } {
  const base = createEmptyLocalState();
  if (!raw) return { state: base, wasCorrupt: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: base, wasCorrupt: true };
  }

  if (!isPlainObject(parsed)) {
    return { state: base, wasCorrupt: true };
  }

  const rawUser = isPlainObject(parsed.user) ? parsed.user : null;
  const user = rawUser
    ? {
        id: typeof rawUser.id === 'string' && rawUser.id ? rawUser.id : base.user.id,
        username: typeof rawUser.username === 'string' ? rawUser.username : base.user.username,
        email: typeof rawUser.email === 'string' ? rawUser.email : base.user.email,
        name: typeof rawUser.name === 'string' && rawUser.name ? rawUser.name : base.user.name,
        role: typeof rawUser.role === 'string' ? rawUser.role : base.user.role,
      }
    : base.user;

  const observations = Array.isArray(parsed.observations)
    ? parsed.observations.filter(
        (o): o is HealthObservation =>
          isPlainObject(o) &&
          typeof o.observationId === 'string' &&
          typeof o.dateKey === 'string' &&
          typeof o.capturedAt === 'string' &&
          isPlainObject(o.vitals)
      )
    : [];

  const history = Array.isArray(parsed.history)
    ? parsed.history.filter(
        (h): h is CheckinEntry =>
          isPlainObject(h) &&
          typeof h.id === 'string' &&
          typeof h.dateKey === 'string' &&
          isPlainObject(h.vitals)
      )
    : [];

  const commsLog = Array.isArray(parsed.commsLog)
    ? parsed.commsLog.filter(
        (c): c is CommsLogEntry =>
          isPlainObject(c) &&
          typeof c.id === 'string' &&
          typeof c.timestamp === 'string' &&
          typeof c.message === 'string'
      )
    : [];

  const currentVitals = isPlainObject(parsed.currentVitals)
    ? (parsed.currentVitals as PartialVitalValues)
    : null;
  const currentContext = isPlainObject(parsed.currentContext)
    ? normalizeContext(parsed.currentContext as Partial<ObservationContext>)
    : null;

  const rawSync = isPlainObject(parsed.syncMeta) ? parsed.syncMeta : null;
  const syncMeta = rawSync
    ? {
        status:
          rawSync.status === 'local_only' || rawSync.status === 'pending_retry' || rawSync.status === 'synced'
            ? rawSync.status
            : base.syncMeta.status,
        lastAttemptAt: typeof rawSync.lastAttemptAt === 'string' ? rawSync.lastAttemptAt : null,
        lastSuccessAt: typeof rawSync.lastSuccessAt === 'string' ? rawSync.lastSuccessAt : null,
        lastHttpStatus: typeof rawSync.lastHttpStatus === 'number' ? rawSync.lastHttpStatus : null,
        lastError: typeof rawSync.lastError === 'string' ? rawSync.lastError : null,
        pendingCount: typeof rawSync.pendingCount === 'number' ? rawSync.pendingCount : 0,
      }
    : base.syncMeta;

  return {
    wasCorrupt: false,
    state: {
      ...base,
      user,
      currentVitals,
      currentContext,
      observations,
      history,
      commsLog,
      lastCheckinAt: typeof parsed.lastCheckinAt === 'string' ? parsed.lastCheckinAt : null,
      gamification: sanitizeGamification(parsed.gamification),
      storageMode:
        parsed.storageMode === 'local_with_remote_retry' ? 'local_with_remote_retry' : 'local_json_atomic',
      syncMeta,
    },
  };
}

function applyRetentionLimits(
  state: PublicUserState,
  limits = {
    maxObservations: MAX_OBSERVATIONS,
    maxHistoryDays: MAX_HISTORY_DAYS,
    maxCommsLog: MAX_COMMS_LOG,
  }
): PublicUserState {
  const sortedComms = [...state.commsLog].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return {
    ...state,
    observations: state.observations.slice(-limits.maxObservations),
    history: state.history.slice(-limits.maxHistoryDays),
    commsLog: sortedComms.slice(0, limits.maxCommsLog),
  };
}

function hydrateDerivedState(state: PublicUserState): { state: PublicUserState; dayResetChanged: boolean } {
  const today = getMissionDateKey();
  let dayResetChanged = false;
  if (state.gamification.lastResetDate !== today) {
    state.gamification.missions = state.gamification.missions.map((m) => ({
      ...m,
      completed: m.lastAwardedDate === today,
    }));
    state.gamification.lastResetDate = today;
    dayResetChanged = true;
  }
  state.evaluation = evaluateHealth(state.currentVitals ?? {}, {
    context: state.currentContext ?? undefined,
    priorObservations: state.observations.slice(0, -1),
  });
  state.gamification.missions = applyClinicalRestrictionsToMissions(
    state.gamification.missions,
    state.evaluation
  );
  return { state, dayResetChanged };
}

function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const domErr = err as { name?: string; code?: number };
  return (
    domErr.name === 'QuotaExceededError' ||
    domErr.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    domErr.code === 22 ||
    domErr.code === 1014
  );
}

function writeStorageState(state: PublicUserState): void {
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function readLocalState(): PublicUserState {
  let raw: string | null = null;
  if (hasLocalStorage()) {
    try {
      raw = window.localStorage.getItem(KEY);
    } catch {
      raw = null;
    }
  }

  const { state: parsedState, wasCorrupt } = parseAndSanitizeState(raw);
  const { state, dayResetChanged } = hydrateDerivedState(applyRetentionLimits(parsedState));

  if ((dayResetChanged || wasCorrupt) && hasLocalStorage()) {
    try {
      writeStorageState(state);
    } catch {
      // No bloquear la lectura si el navegador impide escribir en este momento
    }
  }

  return state;
}

function save(state: PublicUserState): PublicUserState {
  const { state: hydrated } = hydrateDerivedState(applyRetentionLimits(state));
  if (!hasLocalStorage()) {
    return hydrated;
  }

  try {
    writeStorageState(hydrated);
    return hydrated;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      const pruned = applyRetentionLimits(hydrated, {
        maxObservations: 30,
        maxHistoryDays: 14,
        maxCommsLog: 10,
      });
      try {
        writeStorageState(pruned);
        return pruned;
      } catch {
        throw new Error('Almacenamiento local lleno. Libera espacio en el navegador para guardar cambios.');
      }
    }
    throw new Error(err instanceof Error ? err.message : 'No se pudo guardar la bitácora en almacenamiento local.');
  }
}

export function saveLocalCheckin(vitals: unknown, rawContext?: Partial<ObservationContext>, submissionId?: string) {
  const state = readLocalState();
  const normalizedSubmissionId =
    typeof submissionId === 'string' && submissionId.trim().length > 0 ? submissionId.trim() : undefined;

  if (normalizedSubmissionId) {
    const existingIdx = state.observations.findIndex((o) => o.clientSubmissionId === normalizedSubmissionId);
    if (existingIdx !== -1) {
      const existingObs = state.observations[existingIdx];
      const existingEntry: CheckinEntry =
        state.history.find(
          (item) =>
            item.clientSubmissionId === normalizedSubmissionId ||
            item.observationIds?.includes(existingObs.observationId) ||
            item.dateKey === existingObs.dateKey
        ) ?? {
          id: existingObs.observationId,
          dateKey: existingObs.dateKey,
          dayLabel: existingObs.dateKey,
          timestamp: existingObs.capturedAt,
          updatesCount: 1,
          clientSubmissionId: normalizedSubmissionId,
          vitals: existingObs.vitals,
          context: existingObs.context,
          coveragePct: existingObs.coveragePct,
          qualityTier: existingObs.qualityTier,
          observationIds: [existingObs.observationId],
          overallStatus: existingObs.overallStatus,
          readinessScore: existingObs.readinessScore,
          crossConclusionId: existingObs.crossConclusionId,
          algorithmVersion: ALGORITHM_VERSION,
          source: existingObs.source,
        };
      const evaluation = evaluateHealth(existingObs.vitals, {
        context: existingObs.context,
        priorObservations: existingIdx > 0 ? state.observations.slice(0, existingIdx) : [],
      });
      return { consolidated: false, deduplicated: true, entry: existingEntry, evaluation, state };
    }
  }

  const context = normalizeContext(rawContext);
  const evaluation = evaluateHealth(vitals, {
    context,
    priorObservations: state.observations,
    previousStatus: state.history.at(-1)?.overallStatus ?? null,
  });
  if (!evaluation.valid) throw new Error(evaluation.errors[0] || 'Signos vitales inválidos.');

  const now = new Date().toISOString();
  const dateKey = getMissionDateKey();
  const id = generateSafeId();
  const observation: HealthObservation = {
    observationId: id,
    dateKey,
    capturedAt: now,
    source: 'manual',
    clientSubmissionId: normalizedSubmissionId,
    vitals: evaluation.vitals,
    context: evaluation.context,
    overallStatus: evaluation.overallStatus,
    readinessScore: evaluation.readinessScore,
    coveragePct: evaluation.coverage.coveragePct,
    qualityTier: evaluation.quality.tier,
    crossConclusionId: evaluation.crossConclusionId,
  };

  const previous = state.history.find((item) => item.dateKey === dateKey);
  const entry: CheckinEntry = {
    id: previous?.id ?? id,
    dateKey,
    dayLabel: dateKey,
    timestamp: now,
    updatesCount: (previous?.updatesCount ?? 0) + 1,
    clientSubmissionId: normalizedSubmissionId,
    vitals: evaluation.vitals,
    context: evaluation.context,
    coveragePct: evaluation.coverage.coveragePct,
    qualityTier: evaluation.quality.tier,
    observationIds: [...(previous?.observationIds ?? []), id],
    overallStatus: evaluation.overallStatus,
    readinessScore: evaluation.readinessScore,
    crossConclusionId: evaluation.crossConclusionId,
    algorithmVersion: evaluation.algorithmVersion,
    source: 'manual',
  };

  state.observations.push(observation);
  state.history = [...state.history.filter((item) => item.dateKey !== dateKey), entry].sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey)
  );
  state.currentVitals = evaluation.vitals;
  state.currentContext = evaluation.context;
  state.lastCheckinAt = now;
  return { consolidated: Boolean(previous), deduplicated: false, entry, evaluation, state: save(state) };
}

export function completeLocalMission(id: string) {
  const state = readLocalState();
  const mission = state.gamification.missions.find((m) => m.id === id);
  if (!mission) throw new Error('Misión desconocida.');
  if (mission.blockedByRestriction) throw new Error(mission.restrictionReason || 'Misión restringida.');
  const today = getMissionDateKey();
  const alreadyAwardedToday = mission.lastAwardedDate === today;
  mission.completed = true;
  const awardedXp = alreadyAwardedToday ? 0 : mission.xpReward;
  if (!alreadyAwardedToday) {
    mission.lastAwardedDate = today;
    state.gamification.xp += awardedXp;
    state.gamification.level = Math.floor(state.gamification.xp / XP_PER_LEVEL) + 1;
    state.gamification.xpProgressInLevel = state.gamification.xp % XP_PER_LEVEL;
    Object.assign(state.gamification, computeNextStreak(state.gamification.streak, state.gamification.lastStreakDate, today));
  }
  return { state: save(state), awardedXp, alreadyAwardedToday };
}

export function resetLocalMissions() {
  const state = readLocalState();
  state.gamification.missions = state.gamification.missions.map((m) => ({ ...m, completed: false }));
  return { state: save(state) };
}

export function logLocalComms(payload: {
  message: string;
  overallStatus: HealthStatus;
  readinessScore: number | null;
  copiedToClipboard: boolean;
}) {
  const state = readLocalState();
  const entry: CommsLogEntry = { ...payload, id: generateSafeId(), timestamp: new Date().toISOString() };
  state.commsLog.unshift(entry);
  state.commsLog = state.commsLog.slice(0, MAX_COMMS_LOG);
  const nextState = save(state);
  return { entry, commsLog: nextState.commsLog, state: nextState };
}
