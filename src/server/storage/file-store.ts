import fs from 'node:fs';
import path from 'node:path';
import { createDefaultSyncMeta, createSeedDatabase } from './seed-data';
import type { DbState } from './types';

export const MAX_HISTORY_DAYS = 10;
export const MAX_COMMS_LOG = 30;

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

/**
 * Carga el estado local con respaldo automático desde `.bak` si el JSON principal se corrompió.
 */
export function loadDb(): DbState {
  const dbPath = getDbFilePath();
  const bakPath = `${dbPath}.bak`;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const primary = tryReadValidDb(dbPath);
  if (primary) return primary;

  const backup = tryReadValidDb(bakPath);
  if (backup) {
    saveDb(backup);
    return backup;
  }

  const seeded = createSeedDatabase();
  saveDb(seeded);
  return seeded;
}

/**
 * Escritura atómica (.tmp -> respaldo .bak -> rename) para evitar corrupción parcial en disco.
 */
export function saveDb(db: DbState): void {
  const dbPath = getDbFilePath();
  const tmpPath = `${dbPath}.tmp`;
  const bakPath = `${dbPath}.bak`;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const serialized = JSON.stringify(db, null, 2);
  fs.writeFileSync(tmpPath, serialized, 'utf8');

  if (fs.existsSync(dbPath)) {
    const current = tryReadValidDb(dbPath);
    if (current) {
      fs.copyFileSync(dbPath, bakPath);
    }
  }
  fs.renameSync(tmpPath, dbPath);
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
    const db = loadDb();
    return await fn(db);
  } finally {
    release();
    if (writeLocks.get(key) === chained) {
      writeLocks.delete(key);
    }
  }
}
