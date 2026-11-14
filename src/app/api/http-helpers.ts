import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, extractAuthToken } from '@/server/auth/crypto-auth';
import { resolveAuthenticatedUser } from '@/server/repositories/auth-repo';
import type { DbState, DbUser } from '@/server/storage/types';

export type JsonParseResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; response: NextResponse };

export async function parseJsonBody(request: Request): Promise<JsonParseResult> {
  let raw = '';
  try {
    raw = await request.text();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No se pudo leer el cuerpo de la solicitud.' }, { status: 400 }),
    };
  }

  if (!raw.trim()) {
    return { ok: true, data: {} };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'El cuerpo JSON debe ser un objeto válido.' }, { status: 400 }),
      };
    }
    return { ok: true, data: parsed as Record<string, unknown> };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Cuerpo JSON malformado.' }, { status: 400 }),
    };
  }
}

export type AuthGuardResult =
  | { ok: true; db: DbState; user: DbUser; sid: string }
  | { ok: false; response: NextResponse };

export function requireAuth(request: Request): AuthGuardResult {
  const token = extractAuthToken(request);
  const resolved = resolveAuthenticatedUser(token);
  if (!resolved) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autenticado o sesión expirada.' }, { status: 401 }),
    };
  }
  return { ok: true, ...resolved };
}

export function attachSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
