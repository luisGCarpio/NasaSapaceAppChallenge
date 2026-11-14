import { NextResponse } from 'next/server';
import { extractAuthToken } from '@/server/auth/crypto-auth';
import { logoutSession } from '@/server/repositories/auth-repo';
import { clearSessionCookie } from '../../http-helpers';

export async function POST(request: Request): Promise<NextResponse> {
  const token = extractAuthToken(request);
  await logoutSession(token);
  return clearSessionCookie(NextResponse.json({ ok: true }, { status: 200 }));
}
