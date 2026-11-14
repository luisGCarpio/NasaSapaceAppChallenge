import fs from 'node:fs/promises';
import path from 'node:path';
import { evaluateHealth, type HealthEvaluation } from '@/domain/health';
import type { PriorObservationInput } from '@/domain/health/context-specs';
import {
  runRetrospectiveNasaBenchmark,
  type BenchmarkMetrics,
} from '@/domain/nasa/benchmark-runner';
import type {
  NasaAuditInventory,
  NasaResearchObservation,
  NasaStudyId,
} from '@/domain/nasa/nasa-types';

const NORM_DIR = path.join(process.cwd(), 'data', 'nasa-normalized');

let cachedInventory: NasaAuditInventory | null = null;
let cachedObservations: NasaResearchObservation[] | null = null;
let cachedBenchmark: BenchmarkMetrics | null = null;

export interface NasaSubjectSummary {
  subjectId: string;
  cohortGroup: string;
  studyIds: NasaStudyId[];
  missionType: 'spaceflight' | 'bedrest_analog';
  observationCount: number;
  vitalsCount: number;
  availableVitals: string[];
  firstLabel: string;
  lastLabel: string;
}

export interface NasaTimelinePoint {
  observation: NasaResearchObservation;
  evaluation: HealthEvaluation;
}

export interface NasaSubjectTimelineResult {
  subject: NasaSubjectSummary | null;
  points: NasaTimelinePoint[];
  v2EvaluablePoints: number;
  v3EvaluablePoints: number;
}

export async function getNasaAuditInventory(): Promise<NasaAuditInventory> {
  if (cachedInventory) return cachedInventory;
  const raw = await fs.readFile(path.join(NORM_DIR, 'audit-inventory.json'), 'utf8');
  cachedInventory = JSON.parse(raw) as NasaAuditInventory;
  return cachedInventory;
}

export async function getNasaObservations(): Promise<NasaResearchObservation[]> {
  if (cachedObservations) return cachedObservations;
  const raw = await fs.readFile(path.join(NORM_DIR, 'observations.json'), 'utf8');
  cachedObservations = JSON.parse(raw) as NasaResearchObservation[];
  return cachedObservations;
}

export async function getNasaBenchmarkSummary(): Promise<BenchmarkMetrics> {
  if (cachedBenchmark) return cachedBenchmark;
  const obs = await getNasaObservations();
  cachedBenchmark = runRetrospectiveNasaBenchmark(obs);
  return cachedBenchmark;
}

export async function listNasaSubjects(): Promise<NasaSubjectSummary[]> {
  const obs = await getNasaObservations();
  const bySubj = new Map<string, NasaResearchObservation[]>();

  for (const item of obs) {
    const list = bySubj.get(item.subjectId) ?? [];
    list.push(item);
    bySubj.set(item.subjectId, list);
  }

  const summaries: NasaSubjectSummary[] = [];
  for (const [subjectId, rows] of bySubj.entries()) {
    const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
    const vitalsSet = new Set<string>();
    const studySet = new Set<NasaStudyId>();
    let vitalsCount = 0;

    for (const r of sorted) {
      studySet.add(r.studyId);
      const keys = Object.entries(r.vitals)
        .filter(([, v]) => typeof v === 'number')
        .map(([k]) => k);
      if (keys.length > 0) vitalsCount++;
      for (const k of keys) vitalsSet.add(k);
    }

    if (vitalsCount === 0) continue;

    summaries.push({
      subjectId,
      cohortGroup: sorted[0].cohortGroup,
      studyIds: [...studySet],
      missionType: sorted[0].missionType,
      observationCount: sorted.length,
      vitalsCount,
      availableVitals: [...vitalsSet],
      firstLabel: sorted[0].relativeLabel,
      lastLabel: sorted[sorted.length - 1].relativeLabel,
    });
  }

  return summaries.sort((a, b) => a.cohortGroup.localeCompare(b.cohortGroup) || a.subjectId.localeCompare(b.subjectId));
}

export async function getNasaSubjectTimeline(
  subjectId: string,
  studyFilter?: string | null
): Promise<NasaSubjectTimelineResult> {
  const obs = await getNasaObservations();
  const summaries = await listNasaSubjects();
  const subject = summaries.find((s) => s.subjectId === subjectId) ?? null;

  const subjectRows = obs
    .filter((o) => o.subjectId === subjectId)
    .filter((o) => !studyFilter || o.studyId === studyFilter)
    .filter((o) => Object.values(o.vitals).some((v) => typeof v === 'number'))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const prior: PriorObservationInput[] = [];
  const points: NasaTimelinePoint[] = [];
  let v2Count = 0;

  for (const row of subjectRows) {
    const evalRes = evaluateHealth(row.vitals, {
      context: row.context,
      priorObservations: prior,
    });
    if (evalRes.coverage.presentCount === 7) v2Count++;
    points.push({ observation: row, evaluation: evalRes });

    prior.push({
      observationId: row.observationId,
      sortOrder: row.sortOrder,
      overallStatus: evalRes.overallStatus,
      vitals: row.vitals,
      context: row.context,
    });
  }

  return {
    subject,
    points,
    v2EvaluablePoints: v2Count,
    v3EvaluablePoints: points.filter((p) => p.evaluation.valid).length,
  };
}
