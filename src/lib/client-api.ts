import type {
  HealthEvaluation,
  HealthStatus,
  PartialVitalValues,
  ScenarioId,
  VitalValues,
} from '@/domain/health';
import type { BenchmarkMetrics } from '@/domain/nasa/benchmark-runner';
import type { NasaAuditInventory, ObservationContext } from '@/domain/nasa/nasa-types';
import type { CheckinEntry, CommsLogEntry, PublicUser, PublicUserState } from '@/server/storage/types';
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

export function apiGetState(): Promise<PublicUserState> {
  return requestJson<PublicUserState>('/api/state', { method: 'GET' });
}

export function apiLogin(payload: { identifier: string; password: string }): Promise<{
  token: string;
  user: PublicUser;
  state: PublicUserState;
}> {
  return requestJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function apiRegister(payload: {
  name: string;
  username: string;
  email?: string;
  role?: string;
  password: string;
}): Promise<{ token: string; user: PublicUser; state: PublicUserState }> {
  return requestJson('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function apiLogout(): Promise<{ ok: boolean }> {
  return requestJson('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
}

export function apiEvaluate(
  vitals: Record<string, unknown>,
  context?: Partial<ObservationContext>
): Promise<{
  valid: boolean;
  vitals: PartialVitalValues;
  evaluation: HealthEvaluation;
}> {
  return requestJson('/api/evaluate', {
    method: 'POST',
    body: JSON.stringify({ vitals, context }),
  });
}

export function apiSaveCheckin(payload: {
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
  return requestJson('/api/checkin', {
    method: 'POST',
    body: JSON.stringify({ ...payload, isSimulation: false }),
  });
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

export function apiCompleteMission(missionId: string): Promise<{
  state: PublicUserState;
  awardedXp: number;
  alreadyAwardedToday: boolean;
}> {
  return requestJson('/api/mission/complete', {
    method: 'POST',
    body: JSON.stringify({ missionId }),
  });
}

export function apiResetMissions(): Promise<{ state: PublicUserState }> {
  return requestJson('/api/mission/reset', { method: 'POST', body: JSON.stringify({}) });
}

export function apiLogComms(payload: {
  message: string;
  overallStatus: HealthStatus;
  readinessScore: number | null;
  copiedToClipboard: boolean;
}): Promise<{ entry: CommsLogEntry; commsLog: CommsLogEntry[]; state: PublicUserState }> {
  return requestJson('/api/comms/log', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
