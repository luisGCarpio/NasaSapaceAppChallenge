import crypto from 'node:crypto';

export const SESSION_COOKIE_NAME = 'ares_session';
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export interface SessionTokenPayload {
  sub: string;
  sid: string;
  exp: number;
}

const globalForSecret = globalThis as typeof globalThis & { __aresSessionSecret?: string };

function getSessionSecret(): string {
  if (process.env.ARES_SESSION_SECRET && process.env.ARES_SESSION_SECRET.length >= 16) {
    return process.env.ARES_SESSION_SECRET;
  }
  if (!globalForSecret.__aresSessionSecret) {
    globalForSecret.__aresSessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return globalForSecret.__aresSessionSecret;
}

/**
 * Hashea una contraseña con scrypt y salt aleatorio de 16 bytes.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

/**
 * Verifica una contraseña contra un hash `scrypt$<salt>$<hash>` en tiempo constante.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hexDigest] = parts;
  if (!salt || !hexDigest) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hexDigest, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Firma un token de sesión compacto con HMAC-SHA256.
 */
export function signSessionToken(payload: SessionTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Verifica firma HMAC y expiración de un token de sesión.
 */
export function verifySessionToken(token: string | null | undefined): SessionTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;

  try {
    const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
    const providedBuf = Buffer.from(providedSig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<SessionTokenPayload>;
    if (!decoded.sub || !decoded.sid || typeof decoded.exp !== 'number') return null;
    if (Date.now() > decoded.exp) return null;
    return { sub: decoded.sub, sid: decoded.sid, exp: decoded.exp };
  } catch {
    return null;
  }
}

/**
 * Extrae el token Bearer o cookie `ares_session` sin confiar en cabeceras suplantables.
 */
export function extractAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const raw of cookies) {
    const idx = raw.indexOf('=');
    if (idx === -1) continue;
    const key = raw.slice(0, idx).trim();
    if (key === SESSION_COOKIE_NAME) {
      const value = raw.slice(idx + 1).trim();
      if (value) return decodeURIComponent(value);
    }
  }
  return null;
}
