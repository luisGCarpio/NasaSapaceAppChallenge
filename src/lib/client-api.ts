import { evaluateHealth } from '@/domain/health';
import { readLocalState, saveLocalCheckin, completeLocalMission, resetLocalMissions, logLocalComms } from './local-state';
import type {
  HealthEvaluation,
  HealthStatus,
  PartialVitalValues,
  ScenarioId,
  VitalValues,
} from '@/domain/health';
import type { BenchmarkMetrics } from '@/domain/nasa/benchmark-runner';
import type { NasaAuditInventory, ObservationContext } from '@/domain/nasa/nasa-types';
import type { CheckinEntry, CommsLogEntry, PublicUserState } from '@/server/storage/types';
import type {
  NasaSubjectSummary,
  NasaSubjectTimelineResult,
} from '@/server/repositories/nasa-datasets-repo';

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;

  constructor(message: string, status: number, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : `Error HTTP ${response.status}`;
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}

export async function apiGetState(): Promise<PublicUserState> {
  return readLocalState();
}

export function apiEvaluate(
  vitals: Record<string, unknown>,
  context?: Partial<ObservationContext>
): Promise<{
  valid: boolean;
  vitals: PartialVitalValues;
  evaluation: HealthEvaluation;
}> {
  const evaluation = evaluateHealth(vitals, { context });
  if (!evaluation.valid) {
    return Promise.reject(new ApiError(evaluation.errors[0] || 'Datos inválidos', 422, { evaluation }));
  }
  return Promise.resolve({ valid: true, vitals: evaluation.vitals, evaluation });
}

export async function apiSaveCheckin(payload: {
  vitals: Record<string, unknown>;
  context?: Partial<ObservationContext>;
  clientSubmissionId: string;
}): Promise<{
  consolidated: boolean;
  deduplicated: boolean;
  entry: CheckinEntry;
  evaluation: HealthEvaluation;
  state: PublicUserState;
}> {
  return saveLocalCheckin(payload.vitals, payload.context, payload.clientSubmissionId);
}

export function apiRunScenario(scenarioId: ScenarioId): Promise<{
  id: ScenarioId;
  isSimulation: true;
  vitals: VitalValues;
  context?: ObservationContext;
  evaluation: HealthEvaluation;
}> {
  return requestJson(`/api/scenario/${scenarioId}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function apiGetNasaCatalog(): Promise<{
  inventory: NasaAuditInventory;
  benchmark: BenchmarkMetrics;
  subjects: NasaSubjectSummary[];
}> {
  return requestJson('/api/nasa-datasets', { method: 'GET' });
}

export function apiGetNasaSubjectTimeline(
  subjectId: string,
  studyId?: string
): Promise<NasaSubjectTimelineResult> {
  const qs = new URLSearchParams({ subjectId });
  if (studyId) qs.set('studyId', studyId);
  return requestJson(`/api/nasa-datasets?${qs.toString()}`, { method: 'GET' });
}

export async function apiCompleteMission(missionId: string): Promise<{
  state: PublicUserState;
  awardedXp: number;
  alreadyAwardedToday: boolean;
}> {
  return completeLocalMission(missionId);
}

export async function apiResetMissions(): Promise<{ state: PublicUserState }> {
  return resetLocalMissions();
}

export async function apiLogComms(payload: {
  message: string;
  overallStatus: HealthStatus;
  readinessScore: number | null;
  copiedToClipboard: boolean;
}): Promise<{ entry: CommsLogEntry; commsLog: CommsLogEntry[]; state: PublicUserState }> {
  return logLocalComms(payload);
}
