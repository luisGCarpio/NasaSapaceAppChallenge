import type { ObservationContext } from '../nasa/nasa-types';
import type { BaselineMap } from './baseline-analyzer';
import type { CoverageSummary } from './context-specs';
import { makeRuleTrace, type RuleAuditTrace } from './rules-catalog';
import { elevateStatus, pickFinite, type SystemEvalOutput } from './system-mind-body';
import {
  ACTIONS,
  ActionRecommendation,
  HealthStatus,
  PartialVitalValues,
  REFERENCES,
  STATUS,
  STATUS_LABELS,
} from './vital-specs';

export { evaluateBody, evaluateMind, type SystemEvalOutput } from './system-mind-body';

export function evaluateHeart(
  vitals: PartialVitalValues,
  context: ObservationContext,
  baselines: BaselineMap,
  coverage?: CoverageSummary
): SystemEvalOutput {
  const sysCov = coverage?.systemCoverage.heart;
  const traces: RuleAuditTrace[] = [];
  const hr = pickFinite(vitals.heart_rate);
  const sbp = pickFinite(vitals.bp_systolic);
  const dbp = pickFinite(vitals.bp_diastolic);

  if (hr === undefined && sbp === undefined && dbp === undefined) {
    return {
      evaluation: {
        systemId: 'heart',
        systemName: 'Corazón y Presión',
        systemIcon: 'heart',
        status: STATUS.INSUFFICIENT_DATA,
        label: STATUS_LABELS.INSUFFICIENT_DATA,
        title: 'Sin signos cardiovasculares',
        message: 'No se registró pulso ni presión arterial en esta medición.',
        ...ACTIONS.REVIEW_INPUT,
        reasons: ['Medir FC y PA tras 5 min de reposo sentado.'],
        reference: REFERENCES.HEART,
        coverage: sysCov,
        metricsSummary: 'Sin signos CV registrados',
      },
      traces,
    };
  }

  let status: HealthStatus = STATUS.GREEN;
  const reasons: string[] = [];
  let chosenAction: ActionRecommendation = ACTIONS.BREATHE;
  const isActive = context.activityState === 'post_exercise' || context.activityState === 'eva';
  const isTilt = context.activityState === 'orthostatic_tilt' || context.posture === 'standing_tilt';
  const hasCvSymptoms = context.symptoms.some((s) => /mareo|palpit/i.test(s));

  if (sbp !== undefined && dbp !== undefined) {
    const bpBase = baselines.bp_systolic;
    if (sbp >= 180 || dbp >= 120) {
      status = elevateStatus(status, STATUS.RED);
      reasons.push(`Crisis hipertensiva (${sbp}/${dbp} mmHg >= 180/120).`);
      chosenAction = ACTIONS.COMMS;
      traces.push(makeRuleTrace({
        ruleId: 'HEART_BP_CRISIS',
        title: 'Crisis hipertensiva (AHA)',
        inputsUsed: ['bp_systolic', 'bp_diastolic'],
        thresholdApplied: 'SBP >= 180 o DBP >= 120 mmHg',
        baselineComparison: bpBase?.summaryText,
        exclusions: 'Ninguna — límite absoluto de seguridad',
        followUpWindow: 'Inmediato (5 min)',
        sourceKey: 'aha_bp',
      }));
    } else if (sbp < 85 || dbp < 50 || ((sbp < 90 || dbp < 55) && (hasCvSymptoms || (hr !== undefined && hr >= 105)))) {
      status = elevateStatus(status, STATUS.RED);
      reasons.push(`Hipotensión clínica (${sbp}/${dbp} mmHg${isTilt ? ' durante Tilt' : ''}).`);
      chosenAction = isTilt ? ACTIONS.HYDRATE : ACTIONS.COMMS;
      traces.push(makeRuleTrace({
        ruleId: 'HEART_HYPOTENSION_RED',
        title: 'Hipotensión significativa o sintomática',
        inputsUsed: ['bp_systolic', 'bp_diastolic', ...(hr !== undefined ? ['heart_rate'] : [])],
        thresholdApplied: 'SBP < 85 o DBP < 50 mmHg, o <90/55 con FC>=105/síntomas',
        baselineComparison: bpBase?.summaryText,
        exclusions: 'Distingue lectura limítrofe asintomática en reposo supino',
        followUpWindow: '5–10 min',
        sourceKey: 'nasa_orthostatic',
      }));
    } else if (!isActive && (sbp >= 160 || dbp >= 100)) {
      status = elevateStatus(status, STATUS.RED);
      reasons.push(`Hipertensión marcada en reposo (${sbp}/${dbp} mmHg).`);
      chosenAction = ACTIONS.COMMS;
    } else if (sbp >= 130 || dbp >= 85 || sbp < 90 || dbp < 55) {
      status = elevateStatus(status, STATUS.YELLOW);
      reasons.push(sbp < 90 || dbp < 55 ? `PA limítrofe baja (${sbp}/${dbp} mmHg).` : `PA elevada (${sbp}/${dbp} mmHg${isActive ? ' post-esfuerzo' : ''}).`);
      chosenAction = isActive ? ACTIONS.BREATHE : ACTIONS.REVIEW_INPUT;
      traces.push(makeRuleTrace({
        ruleId: 'HEART_BP_BORDERLINE',
        title: 'Presión fuera de rango óptimo AHA',
        inputsUsed: ['bp_systolic', 'bp_diastolic', 'context.posture'],
        thresholdApplied: '130–159 / 85–99 o <90/55 asintomática',
        baselineComparison: bpBase?.summaryText,
        exclusions: 'Requiere toma en reposo sentado para confirmar',
        followUpWindow: '15–30 min',
        sourceKey: 'aha_bp',
      }));
    }
  }

  if (hr !== undefined) {
    const hrBase = baselines.heart_rate;
    if (hr < 42 || (!isActive && !isTilt && hr >= 120) || ((isActive || isTilt) && hr >= 165) || (hasCvSymptoms && hr >= 115)) {
      status = elevateStatus(status, STATUS.RED);
      reasons.push(`Frecuencia cardíaca crítica (${hr} lpm; contexto: ${context.activityState}).`);
      chosenAction = ACTIONS.COMMS;
      traces.push(makeRuleTrace({
        ruleId: 'HEART_HR_CRITICAL',
        title: 'Taquicardia o bradicardia de prioridad alta',
        inputsUsed: ['heart_rate', 'context.activityState'],
        thresholdApplied: 'FC <42, >=120 en reposo o >=165 en carga/tilt',
        baselineComparison: hrBase?.summaryText,
        exclusions: 'Umbral ajustado en carga física/tilt',
        followUpWindow: '5 min en reposo',
        sourceKey: isTilt ? 'nasa_orthostatic' : 'nasa_standards',
      }));
    } else if (isTilt && hr > 100) {
      status = elevateStatus(status, STATUS.YELLOW);
      reasons.push(`Respuesta taquicárdica en prueba vertical/tilt (${hr} lpm).`);
      chosenAction = ACTIONS.HYDRATE;
      traces.push(makeRuleTrace({
        ruleId: 'HEART_HR_ORTHOSTATIC_TILT',
        title: 'Estrés taquicárdico durante prueba ortostática Tilt',
        inputsUsed: ['heart_rate', 'context.posture'],
        thresholdApplied: 'FC 101–164 lpm durante Tilt/bipedestación',
        baselineComparison: hrBase?.summaryText,
        exclusions: 'No se clasifica como taquicardia basal en reposo',
        followUpWindow: 'Tras 5 min en supino',
        sourceKey: 'nasa_orthostatic',
      }));
    } else if (isActive && hr > 100) {
      status = elevateStatus(status, STATUS.YELLOW);
      reasons.push(`FC elevada post-esfuerzo (${hr} lpm); requiere control en reposo.`);
      chosenAction = ACTIONS.BREATHE;
    } else if (!isActive && !isTilt && (hr > 100 || hr < 50)) {
      status = elevateStatus(status, STATUS.YELLOW);
      reasons.push(hr > 100 ? `Taquicardia leve en reposo (${hr} lpm).` : `Bradicardia leve en reposo (${hr} lpm).`);
      chosenAction = ACTIONS.BREATHE;
    } else if (!isActive && !isTilt && hrBase?.significantDrift && (hrBase.deltaFromMedian ?? 0) >= 15) {
      status = elevateStatus(status, STATUS.YELLOW);
      reasons.push(`FC elevada sobre tu mediana personal (${hr} vs ${hrBase.median} lpm).`);
      chosenAction = ACTIONS.HYDRATE;
    }
  }

  return {
    evaluation: {
      systemId: 'heart',
      systemName: 'Corazón y Presión',
      systemIcon: 'heart',
      status,
      label: STATUS_LABELS[status],
      title: status === STATUS.RED ? 'Alerta cardiovascular de prioridad alta' : status === STATUS.YELLOW ? 'Vigilancia cardiovascular / contextual' : 'Cardiovascular estable',
      message: reasons.length > 0 ? reasons.join(' ') : 'Frecuencia cardíaca y/o presión estables para el contexto registrado.',
      ...chosenAction,
      reasons: reasons.length > 0 ? reasons : [`FC ${hr ?? '—'} lpm · PA ${sbp ?? '—'}/${dbp ?? '—'} mmHg.`],
      reference: isTilt ? REFERENCES.BODY : REFERENCES.HEART,
      coverage: sysCov,
      metricsSummary: [hr !== undefined ? `${hr} lpm` : null, sbp !== undefined && dbp !== undefined ? `${sbp}/${dbp} mmHg` : null].filter(Boolean).join(' · '),
    },
    traces,
  };
}
