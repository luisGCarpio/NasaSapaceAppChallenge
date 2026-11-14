import { NextResponse } from 'next/server';
import { SCENARIOS, evaluateHealth, type ScenarioId } from '@/domain/health';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!(id in SCENARIOS)) {
    return NextResponse.json({ error: `Escenario desconocido: ${id}` }, { status: 404 });
  }

  const scenarioId = id as ScenarioId;
  const vitals = SCENARIOS[scenarioId];
  const evaluation = evaluateHealth(vitals);

  return NextResponse.json(
    {
      id: scenarioId,
      isSimulation: true,
      vitals,
      evaluation,
    },
    { status: 200 }
  );
}
