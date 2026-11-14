import { NextResponse } from 'next/server';
import { evaluateHealth } from '@/domain/health';
import { parseJsonBody } from '../http-helpers';

export async function POST(request: Request): Promise<NextResponse> {
  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const rawVitals = 'vitals' in bodyResult.data ? bodyResult.data.vitals : bodyResult.data;
  const evaluation = evaluateHealth(rawVitals);

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

  return NextResponse.json(
    {
      valid: true,
      vitals: evaluation.vitals,
      evaluation,
    },
    { status: 200 }
  );
}
