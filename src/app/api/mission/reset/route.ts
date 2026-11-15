import { NextResponse } from 'next/server';
import { resetUserMissions } from '@/server/repositories/mission-repo';
import { requireAuth } from '../../http-helpers';

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const result = await resetUserMissions(auth.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ state: result.state }, { status: 200 });
}
