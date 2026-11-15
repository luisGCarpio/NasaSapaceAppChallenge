import { NextResponse } from 'next/server';
import { STATUS, type HealthStatus } from '@/domain/health';
import { recordUserCommsLog } from '@/server/repositories/mission-repo';
import { parseJsonBody, parseOptionalBoolean, requireAuth } from '../../http-helpers';

const VALID_STATUSES = new Set<HealthStatus>([
  STATUS.GREEN,
  STATUS.YELLOW,
  STATUS.RED,
  STATUS.INSUFFICIENT_DATA,
]);
const MAX_COMMS_MESSAGE_LENGTH = 4000;

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const data = bodyResult.data;
  if (typeof data.overallStatus !== 'string' || !VALID_STATUSES.has(data.overallStatus as HealthStatus)) {
    return NextResponse.json(
      { error: 'overallStatus inválido. Valores permitidos: GREEN, YELLOW, RED, INSUFFICIENT_DATA.' },
      { status: 400 }
    );
  }
  const overallStatus = data.overallStatus as HealthStatus;

  let readinessScore: number | null = null;
  if (data.readinessScore !== undefined && data.readinessScore !== null) {
    if (
      typeof data.readinessScore !== 'number' ||
      !Number.isFinite(data.readinessScore) ||
      data.readinessScore < 0 ||
      data.readinessScore > 100
    ) {
      return NextResponse.json(
        { error: 'readinessScore debe ser null o un número finito entre 0 y 100.' },
        { status: 400 }
      );
    }
    readinessScore = data.readinessScore;
  }

  if (typeof data.message !== 'string' || !data.message.trim()) {
    return NextResponse.json({ error: 'El mensaje de reporte es obligatorio.' }, { status: 400 });
  }
  if (data.message.trim().length > MAX_COMMS_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `El mensaje de reporte no puede exceder ${MAX_COMMS_MESSAGE_LENGTH} caracteres.` },
      { status: 400 }
    );
  }

  const copiedFlag = parseOptionalBoolean(data.copiedToClipboard);
  if (!copiedFlag.ok) {
    return NextResponse.json({ error: 'copiedToClipboard debe ser booleano.' }, { status: 400 });
  }

  const result = await recordUserCommsLog({
    userId: auth.user.id,
    message: data.message,
    overallStatus,
    readinessScore,
    copiedToClipboard: copiedFlag.value,
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
