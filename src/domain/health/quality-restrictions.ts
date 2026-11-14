import type { ObservationContext } from '../nasa/nasa-types';
import type { BaselineMap } from './baseline-analyzer';
import type { CoverageSummary, QualityAssessment, QualityTier } from './context-specs';
import { buildCommsMessage } from './report-builder';
import {
  ACTIONS,
  ALGORITHM_VERSION,
  ClinicalRestrictions,
  HealthEvaluation,
  HealthStatus,
  PartialVitalValues,
  REFERENCES,
  STATUS,
  STATUS_LABELS,
  SystemEvaluation,
  SystemId,
} from './vital-specs';

export function buildEmptySystem(
  systemId: SystemId,
  systemName: string,
  systemIcon: SystemEvaluation['systemIcon'],
  message: string
): SystemEvaluation {
  return {
    systemId,
    systemName,
    systemIcon,
    status: STATUS.INSUFFICIENT_DATA,
    label: STATUS_LABELS.INSUFFICIENT_DATA,
    title: 'Sin datos suficientes',
    message,
    ...ACTIONS.REVIEW_INPUT,
    reasons: [message],
    reference: REFERENCES[systemId.toUpperCase() as 'MIND' | 'HEART' | 'BODY'],
  };
}

export function assessQuality(opts: {
  vitals: PartialVitalValues;
  context: ObservationContext;
  coverage: CoverageSummary;
  overallStatus: HealthStatus;
}): QualityAssessment {
  const { vitals, context, coverage, overallStatus } = opts;
  const reasons: string[] = [];
  let needsRecheck = false;
  let recheckWindow: string | null = null;

  const gluc = typeof vitals.glucose === 'number' ? vitals.glucose : undefined;
  const hr = typeof vitals.heart_rate === 'number' ? vitals.heart_rate : undefined;

  if (gluc !== undefined && gluc >= 100 && context.glucoseTiming === 'unknown') {
    reasons.push('Glucemia >=100 mg/dL sin especificar ayuno vs postprandial.');
    needsRecheck = true;
    recheckWindow = 'Confirmar en próximo ayuno (>=8 h)';
  }
  if (hr !== undefined && hr > 100 && (context.activityState === 'post_exercise' || context.activityState === 'eva')) {
    reasons.push('FC elevada post-esfuerzo; requiere lectura basal en reposo.');
    needsRecheck = true;
    recheckWindow = '5 min en reposo sentado';
  }
  if (overallStatus === STATUS.RED && !context.confirmedRepeated) {
    reasons.push('Lectura crítica única sin segunda medición confirmatoria.');
    needsRecheck = true;
    recheckWindow = recheckWindow ?? 'Repetir en 5–15 min tras reposo';
  }
  if (coverage.presentCount < 4) {
    reasons.push(`Cobertura parcial (${coverage.presentCount}/${coverage.totalCount} indicadores medidos).`);
  }

  let tier: QualityTier = 'provisional';
  if (
    (gluc !== undefined && gluc >= 100 && context.glucoseTiming === 'unknown') ||
    (hr !== undefined && hr > 100 && (context.activityState === 'post_exercise' || context.activityState === 'eva')) ||
    (overallStatus === STATUS.RED && !context.confirmedRepeated)
  ) {
    tier = 'contextual_pending';
  } else if (coverage.presentCount < 4) {
    tier = 'incomplete';
  } else if (coverage.presentCount >= 5 && (overallStatus === STATUS.GREEN || context.confirmedRepeated)) {
    tier = 'verified';
  }

  const labels: Record<QualityTier, string> = {
    verified: 'Medición verificada y contextualizada',
    provisional: 'Lectura única válida (provisional)',
    incomplete: 'Cobertura parcial de sistemas',
    contextual_pending: 'Requiere confirmación / contexto adicional',
  };

  return {
    tier,
    label: labels[tier],
    reasons,
    contextComplete: context.glucoseTiming !== 'unknown' || gluc === undefined,
    confirmedRepeated: context.confirmedRepeated,
    needsRecheck,
    recheckWindow,
  };
}

export function deriveClinicalRestrictions(
  vitals: PartialVitalValues,
  context: ObservationContext,
  overallStatus: HealthStatus
): ClinicalRestrictions {
  const reasons: string[] = [];
  if (overallStatus === STATUS.RED) reasons.push('Alerta clínica de prioridad alta activa.');
  if (typeof vitals.temperature === 'number' && vitals.temperature >= 37.7) {
    reasons.push(`Temperatura elevada (${vitals.temperature} °C).`);
  }
  if (typeof vitals.heart_rate === 'number' && vitals.heart_rate >= 105 && context.activityState === 'rest') {
    reasons.push(`Taquicardia en reposo (${vitals.heart_rate} lpm).`);
  }
  if (typeof vitals.glucose === 'number' && vitals.glucose < 70) {
    reasons.push(`Glucemia baja (${vitals.glucose} mg/dL).`);
  }
  if (
    (typeof vitals.bp_systolic === 'number' && vitals.bp_systolic >= 160) ||
    (typeof vitals.bp_diastolic === 'number' && vitals.bp_diastolic >= 100)
  ) {
    reasons.push('Presión arterial elevada >=160/100 mmHg.');
  }
  return { restrictStrenuousExercise: reasons.length > 0, reasons };
}

export function buildInvalidEvaluation(opts: {
  vitals: PartialVitalValues;
  context: ObservationContext;
  coverage: CoverageSummary;
  fieldErrors: Record<string, string>;
  errors: string[];
}): HealthEvaluation {
  const { vitals, context, coverage, fieldErrors, errors } = opts;
  const emptyMsg = errors[0] || 'No hay datos suficientes.';
  const systems: Record<SystemId, SystemEvaluation> = {
    mind: buildEmptySystem('mind', 'Mente y Sueño', 'brain', emptyMsg),
    heart: buildEmptySystem('heart', 'Corazón y Presión', 'heart', emptyMsg),
    body: buildEmptySystem('body', 'Cuerpo y Metabolismo', 'shield', emptyMsg),
  };
  const isInputErr = Object.keys(fieldErrors).length > 0;
  const quality: QualityAssessment = {
    tier: 'incomplete',
    label: 'Sin lectura evaluable',
    reasons: errors,
    contextComplete: false,
    confirmedRepeated: false,
    needsRecheck: false,
    recheckWindow: null,
  };
  const crossConclusion = {
    id: null,
    status: STATUS.INSUFFICIENT_DATA,
    label: STATUS_LABELS.INSUFFICIENT_DATA,
    title: isInputErr ? 'Error de formato o rango fisiológico' : 'Datos insuficientes para evaluación',
    message: emptyMsg,
    ...ACTIONS.REVIEW_INPUT,
    reasons: errors,
    reference: REFERENCES.CSA,
  };

  return {
    valid: false,
    algorithmVersion: ALGORITHM_VERSION,
    overallStatus: STATUS.INSUFFICIENT_DATA,
    overallLabel: STATUS_LABELS.INSUFFICIENT_DATA,
    readinessScore: null,
    scoreConfidence: 'insufficient',
    scoreBreakdown: [],
    fieldErrors,
    errors,
    systems,
    crossConclusion,
    crossConclusionId: null,
    triggeredCrosses: [],
    commsMessage: buildCommsMessage({
      overallStatus: STATUS.INSUFFICIENT_DATA,
      readinessScore: null,
      vitals,
      context,
      coverage,
      quality,
      crossConclusion,
    }),
    vitals,
    context,
    coverage,
    quality,
    baselines: {} as BaselineMap,
    ruleTraces: [],
    clinicalRestrictions: { restrictStrenuousExercise: false, reasons: [] },
    missingSystems: ['mind', 'heart', 'body'],
  };
}
