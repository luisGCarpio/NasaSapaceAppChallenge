import crypto from 'node:crypto';
import { z } from 'zod';
import { createInitialGamification } from '@/domain/missions/mission-catalog';
import {
  SESSION_TTL_MS,
  hashPassword,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from '../auth/crypto-auth';
import { readDb, saveDb, withDbLock } from '../storage/file-store';
import type { DbState, DbUser, PublicUser, PublicUserState } from '../storage/types';
import { buildPublicUserState, toPublicUser } from './state-presenter';

const MAX_PASSWORD_LENGTH = 256;

const registerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_.-]{3,32}$/, 'El usuario debe tener 3-32 caracteres alfanuméricos.'),
  email: z.string().trim().email('Correo electrónico inválido.').optional().or(z.literal('')),
  role: z.string().trim().min(2).max(80).optional(),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres.')
    .max(MAX_PASSWORD_LENGTH, 'La contraseña no puede exceder 256 caracteres.'),
});

export type AuthActionResult =
  | { ok: true; status: 200 | 201; token: string; user: PublicUser; state: PublicUserState }
  | { ok: false; status: 400 | 401 | 409; error: string };

function pruneExpiredSessions(db: DbState): void {
  const now = Date.now();
  for (const [sid, session] of Object.entries(db.sessions)) {
    if (!session?.expiresAt || new Date(session.expiresAt).getTime() <= now) {
      delete db.sessions[sid];
    }
  }
}

function issueSession(db: DbState, user: DbUser): string {
  pruneExpiredSessions(db);
  const sid = crypto.randomUUID();
  const nowMs = Date.now();
  const expMs = nowMs + SESSION_TTL_MS;
  db.sessions[sid] = {
    userId: user.id,
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(expMs).toISOString(),
  };
  return signSessionToken({ sub: user.id, sid, exp: expMs });
}

export async function loginUser(input: {
  identifier?: string;
  username?: string;
  email?: string;
  password?: string;
  quickLogin?: boolean;
}): Promise<AuthActionResult> {
  const rawIdentifier = (input.identifier ?? input.username ?? input.email ?? '').trim().toLowerCase();
  const password = typeof input.password === 'string' ? input.password : '';

  if (input.quickLogin && !password) {
    return {
      ok: false,
      status: 400,
      error: 'El acceso rápido sin contraseña está deshabilitado; ingrese su contraseña.',
    };
  }
  if (!rawIdentifier || !password) {
    return { ok: false, status: 400, error: 'Se requiere usuario/correo y contraseña.' };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, status: 400, error: 'La contraseña excede la longitud máxima permitida.' };
  }

  return withDbLock((db) => {
    const user = Object.values(db.users).find(
      (candidate) =>
        candidate.username.toLowerCase() === rawIdentifier ||
        candidate.email.toLowerCase() === rawIdentifier
    );

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { ok: false, status: 401, error: 'Credenciales inválidas.' };
    }

    const token = issueSession(db, user);
    saveDb(db);
    return { ok: true, status: 200, token, user: toPublicUser(user), state: buildPublicUserState(db, user) };
  });
}

export async function registerUser(rawInput: unknown): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? 'Datos de registro inválidos.';
    return { ok: false, status: 400, error: firstIssue };
  }

  const { name, username, email, role, password } = parsed.data;
  const normalizedUser = username.toLowerCase();
  const normalizedEmail = (email && email.trim() ? email.trim() : `${normalizedUser}@ares.nasa`).toLowerCase();

  return withDbLock((db) => {
    const duplicate = Object.values(db.users).some(
      (u) => u.username.toLowerCase() === normalizedUser || u.email.toLowerCase() === normalizedEmail
    );
    if (duplicate) {
      return { ok: false, status: 409, error: 'El usuario o correo electrónico ya está registrado.' };
    }

    const id = normalizedUser;
    const newUser: DbUser = {
      id,
      username: normalizedUser,
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      name,
      role: role || 'Astronauta — Tripulación A.R.E.S.',
      currentVitals: null,
      currentContext: null,
      lastCheckinAt: null,
      history: [],
      observations: [],
      commsLog: [],
      gamification: createInitialGamification(),
    };

    db.users[id] = newUser;
    const token = issueSession(db, newUser);
    saveDb(db);
    return { ok: true, status: 201, token, user: toPublicUser(newUser), state: buildPublicUserState(db, newUser) };
  });
}

export async function resolveAuthenticatedUser(
  token: string | null
): Promise<{ db: DbState; user: DbUser; sid: string } | null> {
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const db = await readDb();
  const session = db.sessions[payload.sid];
  if (!session || session.userId !== payload.sub) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) return null;

  const user = db.users[payload.sub];
  if (!user) return null;
  return { db, user, sid: payload.sid };
}

export async function logoutSession(token: string | null): Promise<void> {
  const payload = verifySessionToken(token);
  if (!payload) return;
  await withDbLock((db) => {
    if (db.sessions[payload.sid]) {
      delete db.sessions[payload.sid];
      saveDb(db);
    }
  });
}
