import { analyzePersonalBaselines } from './baseline-analyzer';
import { EvaluateHealthOptions, normalizeContext } from './context-specs';
import { evaluateCrosses, getWorstStatus } from './cross-evaluator';
import {
  assessQuality,
  buildInvalidEvaluation,
  deriveClinicalRestrictions,
} from './quality-restrictions';
import { buildCommsMessage } from './report-builder';
import type { RuleAuditTrace } from './rules-catalog';
import { evaluateBody, evaluateHeart, evaluateMind } from './systems-evaluator';
import { validateVitals } from './vital-schema';
import {
  ALGORITHM_VERSION,
  HealthEvaluation,
  STATUS,
  STATUS_LABELS,
  SystemEvaluation,
  SystemId,
} from './vital-specs';
import { computeWellnessIndex } from './wellness-index';

export * from './vital-specs';
export * from './context-specs';
export * from './rules-catalog';
export * from './baseline-analyzer';
export { validateVitals, computeCoverage } from './vital-schema';
export { SCENARIOS, SCENARIOS_META, type ScenarioId, type ScenarioMetadata } from './scenarios';

export function evaluateHealth(
  rawVitals: unknown,
  options: EvaluateHealthOptions = {}
): HealthEvaluation {
  const context = normalizeContext(options.context);
  const validation = validateVitals(rawVitals);

  if (!validation.valid) {
    return buildInvalidEvaluation({
      vitals: validation.vitals,
      context,
      coverage: validation.coverage,
      fieldErrors: validation.fieldErrors,
      errors: validation.errors,
    });
  }

  const baselines = analyzePersonalBaselines(
    validation.vitals,
    context,
    options.priorObservations ?? []
  );
  const mindOut = evaluateMind(validation.vitals, context, baselines, validation.coverage);
  const heartOut = evaluateHeart(validation.vitals, context, baselines, validation.coverage);
  const bodyOut = evaluateBody(validation.vitals, context, baselines, validation.coverage);

  const systems: Record<SystemId, SystemEvaluation> = {
    mind: mindOut.evaluation,
    heart: heartOut.evaluation,
    body: bodyOut.evaluation,
  };

  const { crossConclusion, triggeredCrosses } = evaluateCrosses(
    validation.vitals,
    context,
    systems
  );
  const overallStatus = getWorstStatus(systems, triggeredCrosses);
  const scoreRes = computeWellnessIndex({
    vitals: validation.vitals,
    systems,
    overallStatus,
    triggeredCrosses,
    coverage: validation.coverage,
  });

  const quality = assessQuality({
    vitals: validation.vitals,
    context,
    coverage: validation.coverage,
    overallStatus,
  });

  const ruleTraces: RuleAuditTrace[] = [
    ...mindOut.traces,
    ...heartOut.traces,
    ...bodyOut.traces,
    ...triggeredCrosses
      .map((c) => c.ruleTrace)
      .filter((t): t is RuleAuditTrace => Boolean(t)),
  ];

  const missingSystems = (Object.keys(systems) as SystemId[]).filter(
    (k) => systems[k].status === STATUS.INSUFFICIENT_DATA
  );

  const clinicalRestrictions = deriveClinicalRestrictions(
    validation.vitals,
    context,
    overallStatus
  );

  return {
    valid: true,
    algorithmVersion: ALGORITHM_VERSION,
    overallStatus,
    overallLabel: STATUS_LABELS[overallStatus],
    readinessScore: scoreRes.score,
    scoreConfidence: scoreRes.confidence,
    scoreBreakdown: scoreRes.breakdown,
    fieldErrors: {},
    errors: [],
    systems,
    crossConclusion,
    crossConclusionId: crossConclusion.id ?? null,
    triggeredCrosses,
    commsMessage: buildCommsMessage({
      overallStatus,
      readinessScore: scoreRes.score,
      vitals: validation.vitals,
      context,
      coverage: validation.coverage,
      quality,
      crossConclusion,
    }),
    vitals: validation.vitals,
    context,
    coverage: validation.coverage,
    quality,
    baselines,
    ruleTraces,
    clinicalRestrictions,
    missingSystems,
  };
}
