import { NextResponse } from 'next/server';
import { saveUserCheckin } from '@/server/repositories/state-repo';
import { parseJsonBody, requireAuth } from '../http-helpers';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    {
      history: auth.user.history,
      observations: auth.user.observations ?? [],
      currentVitals: auth.user.currentVitals,
      currentContext: auth.user.currentContext ?? null,
      lastCheckinAt: auth.user.lastCheckinAt,
    },
    { status: 200 }
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const data = bodyResult.data;
  const rawVitals = 'vitals' in data ? data.vitals : data;
  const rawContext = 'context' in data ? data.context : undefined;
  const result = await saveUserCheckin({
    userId: auth.user.id,
    rawVitals,
    rawContext,
    isSimulation: Boolean(data.isSimulation),
    clientSubmissionId: typeof data.clientSubmissionId === 'string' ? data.clientSubmissionId : undefined,
    dateKeyOverride: typeof data.dateKey === 'string' ? data.dateKey : undefined,
    source: typeof data.source === 'string' ? data.source : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, evaluation: result.evaluation },
      { status: result.status }
    );
  }

  return NextResponse.json(
    {
      consolidated: result.consolidated,
      deduplicated: result.deduplicated,
      entry: result.entry,
      evaluation: result.evaluation,
      state: result.state,
    },
    { status: 200 }
  );
}
