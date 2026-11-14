import { createInitialGamification } from '@/domain/missions/mission-catalog';
import type { DbState, DbUser, SyncMeta } from './types';

export function createDefaultSyncMeta(): SyncMeta {
  return {
    status: 'local_only',
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastHttpStatus: null,
    lastError: 'Sincronización remota con Supabase opcional no configurada.',
    pendingCount: 0,
  };
}

function createCleanProfile(opts: {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
}): DbUser {
  return {
    id: opts.id,
    username: opts.username,
    email: opts.email,
    passwordHash: opts.passwordHash,
    name: opts.name,
    role: opts.role,
    currentVitals: null,
    currentContext: null,
    lastCheckinAt: null,
    history: [],
    observations: [],
    commsLog: [],
    gamification: createInitialGamification(),
  };
}

export function createSeedDatabase(): DbState {
  return {
    users: {
      elena: createCleanProfile({
        id: 'elena',
        username: 'elena',
        email: 'elena@nasa.gov',
        passwordHash: 'scrypt$5bde7602516abf1d29945d704004f6da$51b6e4b851248765c795770c0a9772dd38dce548d0670ad853f2d5394c67068e6cbe188a136e2f2856a6167c49881bd4ccb103ceb519e9f9f3a94d8f2950d233',
        name: 'Cmdr. Elena Vance',
        role: 'Comandante de Misión — Bitácora Limpia',
      }),
      marco: createCleanProfile({
        id: 'marco',
        username: 'marco',
        email: 'marco@nasa.gov',
        passwordHash: 'scrypt$5c2b10c09cbb43d70f18f3d46e0cd0f5$cadb2ab66414bf9ee3d5eb4c93a46b6df878074431ef8d4d9f9c8401c0fa6e8e2db3ac04a327bdd9451e9725e8bcae210601f53598a6102abf3d6ca1ab9292cf',
        name: 'Esp. Marco Silva',
        role: 'Especialista de Vuelo — Bitácora Limpia',
      }),
    },
    sessions: {},
    pendingSyncQueue: [],
    syncMeta: createDefaultSyncMeta(),
  };
}
