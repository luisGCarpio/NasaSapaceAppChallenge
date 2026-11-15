import { NextResponse } from 'next/server';
import { completeUserMission } from '@/server/repositories/mission-repo';
import { parseJsonBody, requireAuth } from '../../http-helpers';

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const missionId = typeof bodyResult.data.missionId === 'string' ? bodyResult.data.missionId : '';
  const result = await completeUserMission(auth.user.id, missionId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      state: result.state,
      awardedXp: result.awardedXp,
      alreadyAwardedToday: result.alreadyAwardedToday,
    },
    { status: 200 }
  );
}
