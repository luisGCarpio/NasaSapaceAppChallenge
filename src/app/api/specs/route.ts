import { NextResponse } from 'next/server';
import { ALGORITHM_VERSION, SCENARIOS_META, VITAL_SPECS } from '@/domain/health';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    algorithmVersion: ALGORITHM_VERSION,
    vitalSpecs: VITAL_SPECS,
    scenarios: SCENARIOS_META,
  });
}
