import type {
  HealthEvaluation,
  HealthStatus,
  ScenarioId,
  ScenarioMetadata,
  VITAL_SPECS,
  VitalValues,
} from '@/domain/health';
import type { GamificationState } from '@/domain/missions/mission-catalog';

export interface CheckinEntry {
  id: string;
  dateKey: string;
  dayLabel: string;
  timestamp: string;
  updatesCount: number;
  clientSubmissionId?: string;
  vitals: VitalValues;
  overallStatus: HealthStatus;
  readinessScore: number | null;
  crossConclusionId: string | null;
  algorithmVersion: string;
  source: string;
}

export interface CommsLogEntry {
  id: string;
  timestamp: string;
  overallStatus: HealthStatus;
  readinessScore: number | null;
  message: string;
  copiedToClipboard: boolean;
}

export interface SyncMeta {
  status: 'local_only' | 'pending_retry' | 'synced';
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastHttpStatus: number | null;
  lastError: string | null;
  pendingCount: number;
}

export interface SyncQueueItem {
  id: string;
  userId: string;
  type: 'checkin' | 'comms';
  payload: Record<string, unknown>;
  enqueuedAt: string;
}

export interface DbUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  currentVitals: VitalValues | null;
  lastCheckinAt: string | null;
  history: CheckinEntry[];
  commsLog: CommsLogEntry[];
  gamification: GamificationState;
}

export interface SessionRecord {
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface DbState {
  users: Record<string, DbUser>;
  sessions: Record<string, SessionRecord>;
  pendingSyncQueue: SyncQueueItem[];
  syncMeta: SyncMeta;
}

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
}

export interface PublicUserState {
  user: PublicUser;
  currentVitals: VitalValues | null;
  history: CheckinEntry[];
  gamification: GamificationState;
  storageMode: 'local_json_atomic' | 'local_with_remote_retry';
  syncMeta: SyncMeta;
  commsLog: CommsLogEntry[];
  lastCheckinAt: string | null;
  evaluation: HealthEvaluation;
  algorithmVersion: string;
  vitalSpecs: typeof VITAL_SPECS;
  scenarios: Record<ScenarioId, ScenarioMetadata>;
}
