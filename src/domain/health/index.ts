import { evaluateCrosses, getWorstStatus } from './cross-evaluator';
import { buildCommsMessage } from './report-builder';
import { evaluateBody, evaluateHeart, evaluateMind } from './systems-evaluator';
import { validateVitals } from './vital-schema';
import {
  ACTIONS,
  ALGORITHM_VERSION,
  REFERENCES,
  STATUS,
  STATUS_LABELS,
  type ConclusionCard,
  type HealthEvaluation,
} from './vital-specs';
import { computeWellnessIndex } from './wellness-index';

export * from './vital-specs';
export * from './vital-schema';
export * from './scenarios';

/**
 * Evalúa las 6 variables fisiológicas y retorna el diagnóstico integral validado de A.R.E.S. Pulse.
 */
export function evaluateHealth(rawVitals: unknown): HealthEvaluation {
  const validation = validateVitals(rawVitals);
  if (!validation.valid) {
    const count = validation.errors.length;
    const incompleteCard: ConclusionCard = {
      id: 'insufficient_data',
      status: STATUS.INSUFFICIENT_DATA,
      label: STATUS_LABELS[STATUS.INSUFFICIENT_DATA],
      title: 'Datos insuficientes o inválidos',
      message: `No se puede emitir una evaluación saludable sin datos completos (${count} ${count === 1 ? 'error detectado' : 'errores detectados'}).`,
      actionIcon: ACTIONS.REVIEW_INPUT.actionIcon,
      actionText: ACTIONS.REVIEW_INPUT.actionText,
      reasons: validation.errors,
      reference: REFERENCES.MIND,
    };

    return {
      valid: false,
      algorithmVersion: ALGORITHM_VERSION,
      overallStatus: STATUS.INSUFFICIENT_DATA,
      overallLabel: STATUS_LABELS[STATUS.INSUFFICIENT_DATA],
      readinessScore: null,
      scoreBreakdown: [],
      fieldErrors: validation.fieldErrors,
      errors: validation.errors,
      systems: {
        mind: { ...incompleteCard, systemId: 'mind', systemName: 'Mente y Descanso', systemIcon: 'brain' },
        heart: { ...incompleteCard, systemId: 'heart', systemName: 'Corazón y Circulación', systemIcon: 'heart' },
        body: { ...incompleteCard, systemId: 'body', systemName: 'Cuerpo, Energía y Defensas', systemIcon: 'shield' },
      },
      crossConclusion: incompleteCard,
      crossConclusionId: 'insufficient_data',
      triggeredCrosses: [],
      commsMessage: '',
      vitals: validation.vitals,
    };
  }

  const vitals = validation.vitals as Required<import('./vital-specs').VitalValues>;
  const systems = {
    mind: evaluateMind(vitals),
    heart: evaluateHeart(vitals),
    body: evaluateBody(vitals),
  };

  const { crossConclusion, triggeredCrosses } = evaluateCrosses(vitals, systems);
  const overallStatus = getWorstStatus([
    systems.mind.status,
    systems.heart.status,
    systems.body.status,
    crossConclusion.status,
  ]);

  const { readinessScore, scoreBreakdown } = computeWellnessIndex(vitals, overallStatus, crossConclusion);
  const commsMessage = buildCommsMessage(vitals, overallStatus, readinessScore, crossConclusion);

  return {
    valid: true,
    algorithmVersion: ALGORITHM_VERSION,
    overallStatus,
    overallLabel: STATUS_LABELS[overallStatus],
    readinessScore,
    scoreBreakdown,
    fieldErrors: {},
    errors: [],
    systems,
    crossConclusion: { ...crossConclusion, commsMessage },
    crossConclusionId: crossConclusion.id || null,
    triggeredCrosses,
    commsMessage,
    vitals,
  };
}
