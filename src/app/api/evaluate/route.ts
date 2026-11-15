import { NextResponse } from 'next/server';
import { evaluateHealth } from '@/domain/health';
import { evaluateNasaOperationalDecision, type GravityStressMode } from '@/domain/nasa/cohort-decision';
import { parseJsonBody } from '../http-helpers';

export async function POST(request: Request): Promise<NextResponse> {
  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const rawVitals = 'vitals' in bodyResult.data ? bodyResult.data.vitals : bodyResult.data;
  const rawContext = 'context' in bodyResult.data ? bodyResult.data.context : undefined;
  const stressMode: GravityStressMode =
    'stressMode' in bodyResult.data && bodyResult.data.stressMode === 'post_bedrest_p25_vulnerable'
      ? 'post_bedrest_p25_vulnerable'
      : 'post_bedrest_median';
  const evaluation = evaluateHealth(rawVitals, { context: rawContext as never });

  if (!evaluation.valid) {
    return NextResponse.json(
      {
        valid: false,
        evaluation,
        errors: evaluation.errors,
        fieldErrors: evaluation.fieldErrors,
      },
      { status: 422 }
    );
  }

  const operationalDecision = evaluateNasaOperationalDecision(
    evaluation.vitals,
    evaluation,
    rawContext as never,
    stressMode
  );

  return NextResponse.json(
    {
      valid: true,
      vitals: evaluation.vitals,
      evaluation,
      operationalDecision,
    },
    { status: 200 }
  );
}
