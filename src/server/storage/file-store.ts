import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createDefaultSyncMeta, createSeedDatabase } from './seed-data';
import type { DbState } from './types';

export const MAX_HISTORY_DAYS = 365;
export const MAX_OBSERVATIONS_ARCHIVE = 730;
export const MAX_CHART_WINDOW_DAYS = 14;
export const MAX_COMMS_LOG = 50;

const DEFAULT_DB_RELATIVE = path.join('data', 'ares-db.json');

export function getDbFilePath(): string {
  return process.env.ARES_DB_PATH
    ? path.resolve(process.env.ARES_DB_PATH)
    : path.join(process.cwd(), DEFAULT_DB_RELATIVE);
}

function normalizeDbShape(parsed: Partial<DbState> | null | undefined): DbState | null {
  if (!parsed || typeof parsed !== 'object' || !parsed.users || typeof parsed.users !== 'object') {
    return null;
  }
  return {
    users: parsed.users,
    sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
    pendingSyncQueue: Array.isArray(parsed.pendingSyncQueue) ? parsed.pendingSyncQueue : [],
    syncMeta: parsed.syncMeta && typeof parsed.syncMeta === 'object' ? parsed.syncMeta : createDefaultSyncMeta(),
  };
}

function tryReadValidDb(filePath: string): DbState | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return null;
    return normalizeDbShape(JSON.parse(raw) as Partial<DbState>);
  } catch {
    return null;
  }
}

function loadDbInternal(allowPersistRecovery: boolean): DbState {
  const dbPath = getDbFilePath();
  const bakPath = `${dbPath}.bak`;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const primary = tryReadValidDb(dbPath);
  if (primary) return primary;

  const backup = tryReadValidDb(bakPath);
  if (backup) {
    if (allowPersistRecovery) {
      saveDb(backup);
    }
    return backup;
  }

  const seeded = createSeedDatabase();
  if (allowPersistRecovery) {
    saveDb(seeded);
  }
  return seeded;
}

/**
 * Carga el estado local con respaldo automático desde `.bak` si el JSON principal se corrompió.
 * Las lecturas fuera de `withDbLock` nunca sobrescriben `ares-db.json` para evitar carreras con escrituras concurrentes.
 */
export function loadDb(): DbState {
  return loadDbInternal(false);
}

/**
 * Lectura serializada bajo `withDbLock` para evitar colisiones con escrituras o renombres concurrentes.
 */
export function readDb(): Promise<DbState> {
  return withDbLock((db) => db);
}

/**
 * Escritura atómica (.tmp único -> respaldo .bak -> rename) para evitar corrupción parcial en disco.
 */
export function saveDb(db: DbState): void {
  const dbPath = getDbFilePath();
  const tmpPath = `${dbPath}.${process.pid}.${Date.now()}.${crypto.randomUUID()}.tmp`;
  const bakPath = `${dbPath}.bak`;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const serialized = JSON.stringify(db, null, 2);
  try {
    fs.writeFileSync(tmpPath, serialized, 'utf8');

    if (fs.existsSync(dbPath)) {
      const current = tryReadValidDb(dbPath);
      if (current) {
        fs.copyFileSync(dbPath, bakPath);
      }
    }
    fs.renameSync(tmpPath, dbPath);
  } finally {
    if (fs.existsSync(tmpPath)) {
      fs.rmSync(tmpPath, { force: true });
    }
  }
}

const writeLocks = new Map<string, Promise<unknown>>();

/**
 * Serializa mutaciones read-modify-write sobre el archivo JSON activo.
 */
export async function withDbLock<T>(fn: (db: DbState) => Promise<T> | T): Promise<T> {
  const key = getDbFilePath();
  const previous = writeLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => gate);
  writeLocks.set(key, chained);

  await previous;
  try {
    const db = loadDbInternal(true);
    return await fn(db);
  } finally {
    release();
    if (writeLocks.get(key) === chained) {
      writeLocks.delete(key);
    }
  }
}
