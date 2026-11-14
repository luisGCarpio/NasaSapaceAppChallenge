import { NextRequest, NextResponse } from 'next/server';
import {
  getNasaAuditInventory,
  getNasaBenchmarkSummary,
  getNasaSubjectTimeline,
  listNasaSubjects,
} from '@/server/repositories/nasa-datasets-repo';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get('subjectId');
  const studyId = searchParams.get('studyId');
  const view = searchParams.get('view');

  try {
    if (subjectId) {
      const timeline = await getNasaSubjectTimeline(subjectId, studyId);
      if (!timeline.subject) {
        return NextResponse.json({ error: 'Sujeto NASA no encontrado en el catálogo.' }, { status: 404 });
      }
      return NextResponse.json(timeline, { status: 200 });
    }

    if (view === 'benchmark') {
      const [inventory, benchmark] = await Promise.all([
        getNasaAuditInventory(),
        getNasaBenchmarkSummary(),
      ]);
      return NextResponse.json({ inventory, benchmark }, { status: 200 });
    }

    const [inventory, benchmark, subjects] = await Promise.all([
      getNasaAuditInventory(),
      getNasaBenchmarkSummary(),
      listNasaSubjects(),
    ]);

    return NextResponse.json({ inventory, benchmark, subjects }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error leyendo datos NASA.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
