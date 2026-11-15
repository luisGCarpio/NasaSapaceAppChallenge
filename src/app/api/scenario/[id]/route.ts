import { NextResponse } from 'next/server';
import { SCENARIOS, SCENARIOS_META, evaluateHealth, type ScenarioId } from '@/domain/health';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!Object.hasOwn(SCENARIOS, id)) {
    return NextResponse.json({ error: `Escenario desconocido: ${id}` }, { status: 404 });
  }

  const scenarioId = id as ScenarioId;
  const meta = SCENARIOS_META[scenarioId];
  const evaluation = evaluateHealth(meta.vitals, { context: meta.context });

  return NextResponse.json(
    {
      id: scenarioId,
      isSimulation: true,
      vitals: meta.vitals,
      context: meta.context,
      evaluation,
    },
    { status: 200 }
  );
}
