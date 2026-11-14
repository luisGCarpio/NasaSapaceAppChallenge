import type { ObservationContext } from '../nasa/nasa-types';
import type { CoverageSummary, QualityAssessment } from './context-specs';
import {
  ConclusionCard,
  HealthStatus,
  PartialVitalValues,
  STATUS,
  STATUS_LABELS,
} from './vital-specs';

export function buildCommsMessage(opts: {
  overallStatus: HealthStatus;
  readinessScore: number | null;
  vitals: PartialVitalValues;
  context: ObservationContext;
  coverage: CoverageSummary;
  quality: QualityAssessment;
  crossConclusion: ConclusionCard;
}): string {
  const { overallStatus, readinessScore, vitals, context, coverage, quality, crossConclusion } = opts;
  const tag =
    overallStatus === STATUS.RED ? 'PRIORIDAD ALTA'
      : overallStatus === STATUS.YELLOW ? 'PRECAUCION'
      : overallStatus === STATUS.GREEN ? 'NOMINAL'
      : 'INCOMPLETO';

  const scoreStr = readinessScore !== null ? `${readinessScore}/100` : 'No calculable (cobertura parcial)';
  const vitalsParts = [
    typeof vitals.heart_rate === 'number' ? `FC ${vitals.heart_rate}lpm` : null,
    typeof vitals.bp_systolic === 'number' && typeof vitals.bp_diastolic === 'number'
      ? `PA ${vitals.bp_systolic}/${vitals.bp_diastolic}mmHg` : null,
    typeof vitals.temperature === 'number' ? `Temp ${vitals.temperature}C` : null,
    typeof vitals.glucose === 'number' ? `Gluc ${vitals.glucose}mg/dL(${context.glucoseTiming})` : null,
    typeof vitals.sleep_hours === 'number' ? `Sueno ${vitals.sleep_hours}h` : null,
    vitals.mood ? `Animo ${vitals.mood}` : null,
  ].filter(Boolean);

  return [
    `[A.R.E.S. BITACORA CLINICA · ${tag}] Estado: ${STATUS_LABELS[overallStatus]}`,
    `Cobertura: ${coverage.presentCount}/${coverage.totalCount} indicadores (${coverage.coveragePct}%) | Calidad: ${quality.label}`,
    `Contexto: ${context.activityState}, postura ${context.posture}${context.confirmedRepeated ? ', lectura confirmada' : ', toma unica'}${context.symptoms.length ? `, sintomas: ${context.symptoms.join(', ')}` : ''}`,
    `Signos medidos: ${vitalsParts.length ? vitalsParts.join(' | ') : 'Ninguno'}`,
    `Indice bienestar: ${scoreStr}`,
    `Evaluacion: ${crossConclusion.title} — ${crossConclusion.message}`,
    `Accion recomendada: ${crossConclusion.actionText}`,
  ].join('\n');
}
