import crypto from 'node:crypto';
import type { CheckinEntry, DbState } from './types';

export const SYNC_TIMEOUT_MS = 2500;
export const MAX_SYNC_QUEUE = 100;

export interface RemoteSyncConfig {
  url: string;
  key: string;
}

export function getRemoteSyncConfig(): RemoteSyncConfig | null {
  if (process.env.ARES_DISABLE_REMOTE_SYNC === '1') return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

function enqueuePendingSync(
  db: DbState,
  userId: string,
  entry: CheckinEntry,
  now: string,
  httpStatus: number | null,
  errorMessage: string
): void {
  db.pendingSyncQueue.push({
    id: `sync_${crypto.randomUUID()}`,
    userId,
    type: 'checkin',
    payload: { checkinId: entry.id, dateKey: entry.dateKey, overallStatus: entry.overallStatus },
    enqueuedAt: now,
  });
  if (db.pendingSyncQueue.length > MAX_SYNC_QUEUE) {
    db.pendingSyncQueue = db.pendingSyncQueue.slice(-MAX_SYNC_QUEUE);
  }
  db.syncMeta = {
    status: 'pending_retry',
    lastAttemptAt: now,
    lastSuccessAt: db.syncMeta.lastSuccessAt,
    lastHttpStatus: httpStatus,
    lastError: errorMessage,
    pendingCount: db.pendingSyncQueue.length,
  };
}

/**
 * Envía el registro a Supabase REST verificando explícitamente el código HTTP real.
 * Nunca reporta "synced" ante HTTP 404/401/5xx ni errores de red.
 */
export async function attemptCheckinRemoteSync(
  db: DbState,
  userId: string,
  entry: CheckinEntry,
  fetchFn: typeof fetch = fetch
): Promise<void> {
  const config = getRemoteSyncConfig();
  const now = new Date().toISOString();

  if (!config) {
    db.syncMeta = {
      ...db.syncMeta,
      status: db.pendingSyncQueue.length > 0 ? 'pending_retry' : 'local_only',
      lastError: 'Sincronización remota deshabilitada o sin credenciales Supabase configuradas.',
      pendingCount: db.pendingSyncQueue.length,
    };
    return;
  }

  try {
    const response = await fetchFn(`${config.url}/rest/v1/checkins`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        id: entry.id,
        user_id: userId,
        date_key: entry.dateKey,
        sleep_hours: entry.vitals.sleep_hours,
        mood: entry.vitals.mood,
        heart_rate: entry.vitals.heart_rate,
        bp_systolic: entry.vitals.bp_systolic,
        bp_diastolic: entry.vitals.bp_diastolic,
        glucose: entry.vitals.glucose,
        temperature: entry.vitals.temperature,
        overall_status: entry.overallStatus,
        readiness_score: entry.readinessScore,
        cross_conclusion_id: entry.crossConclusionId,
        algorithm_version: entry.algorithmVersion,
        updates_count: entry.updatesCount,
        recorded_at: entry.timestamp,
      }),
      signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
    });

    if (!response.ok) {
      enqueuePendingSync(
        db,
        userId,
        entry,
        now,
        response.status,
        `Supabase rechazó la sincronización (HTTP ${response.status}).`
      );
      return;
    }

    db.syncMeta = {
      status: db.pendingSyncQueue.length > 0 ? 'pending_retry' : 'synced',
      lastAttemptAt: now,
      lastSuccessAt: now,
      lastHttpStatus: response.status,
      lastError: null,
      pendingCount: db.pendingSyncQueue.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fallo de red al contactar Supabase.';
    enqueuePendingSync(db, userId, entry, now, null, message);
  }
}
