import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, extractAuthToken } from '@/server/auth/crypto-auth';
import { resolveAuthenticatedUser } from '@/server/repositories/auth-repo';
import type { DbState, DbUser } from '@/server/storage/types';

export const MAX_JSON_BODY_BYTES = 64 * 1024;

export type JsonParseResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; response: NextResponse };

class PayloadTooLargeError extends Error {}

async function readRequestTextWithinLimit(request: Request, maxBytes: number): Promise<string> {
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader !== null) {
    const declaredBytes = Number(contentLengthHeader);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new PayloadTooLargeError();
    }
  }

  if (!request.body) {
    const text = await request.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) {
      throw new PayloadTooLargeError();
    }
    return text;
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel().catch(() => undefined);
          throw new PayloadTooLargeError();
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const decoder = new TextDecoder('utf-8', { fatal: false });
  return chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join('') + decoder.decode();
}

export async function parseJsonBody(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES
): Promise<JsonParseResult> {
  let raw = '';
  try {
    raw = await readRequestTextWithinLimit(request, maxBytes);
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'El cuerpo de la solicitud excede el tamaño máximo permitido.' },
          { status: 413 }
        ),
      };
    }
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

/**
 * Valida booleanos opcionales de forma estricta sin convertir strings como "false" o "0" en true.
 */
export function parseOptionalBoolean(
  value: unknown
): { ok: true; value: boolean } | { ok: false } {
  if (value === undefined) return { ok: true, value: false };
  if (typeof value === 'boolean') return { ok: true, value };
  return { ok: false };
}

export type AuthGuardResult =
  | { ok: true; db: DbState; user: DbUser; sid: string }
  | { ok: false; response: NextResponse };

export async function requireAuth(request: Request): Promise<AuthGuardResult> {
  const token = extractAuthToken(request);
  const resolved = await resolveAuthenticatedUser(token);
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
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
