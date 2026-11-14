import { NextResponse } from 'next/server';
import { buildPublicUserState } from '@/server/repositories/state-presenter';
import { requireAuth } from '../http-helpers';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json(buildPublicUserState(auth.db, auth.user), { status: 200 });
}
