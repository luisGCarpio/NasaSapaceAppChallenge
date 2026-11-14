import { NextResponse } from 'next/server';
import { STATUS, type HealthStatus } from '@/domain/health';
import { recordUserCommsLog } from '@/server/repositories/mission-repo';
import { parseJsonBody, requireAuth } from '../../http-helpers';

const VALID_STATUSES = new Set<HealthStatus>([
  STATUS.GREEN,
  STATUS.YELLOW,
  STATUS.RED,
  STATUS.INSUFFICIENT_DATA,
]);

export async function POST(request: Request): Promise<NextResponse> {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const data = bodyResult.data;
  const rawStatus = typeof data.overallStatus === 'string' ? (data.overallStatus as HealthStatus) : STATUS.INSUFFICIENT_DATA;
  const overallStatus = VALID_STATUSES.has(rawStatus) ? rawStatus : STATUS.INSUFFICIENT_DATA;
  const readinessScore = typeof data.readinessScore === 'number' ? data.readinessScore : null;

  const result = await recordUserCommsLog({
    userId: auth.user.id,
    message: typeof data.message === 'string' ? data.message : '',
    overallStatus,
    readinessScore,
    copiedToClipboard: Boolean(data.copiedToClipboard),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      entry: result.entry,
      commsLog: result.commsLog,
      state: result.state,
    },
    { status: 200 }
  );
}
