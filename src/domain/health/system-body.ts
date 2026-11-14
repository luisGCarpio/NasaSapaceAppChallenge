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

export function evaluateBody(
  vitals: PartialVitalValues,
  context: ObservationContext,
  baselines: BaselineMap,
  coverage?: CoverageSummary
): SystemEvalOutput {
  const sysCov = coverage?.systemCoverage.body;
  const traces: RuleAuditTrace[] = [];
  const temp = pickFinite(vitals.temperature);
  const gluc = pickFinite(vitals.glucose);

  if (temp === undefined && gluc === undefined) {
    return {
      evaluation: {
        systemId: 'body',
        systemName: 'Cuerpo y Metabolismo',
        systemIcon: 'shield',
        status: STATUS.INSUFFICIENT_DATA,
        label: STATUS_LABELS.INSUFFICIENT_DATA,
        title: 'Sin temperatura ni glucemia',
        message: 'No se registraron temperatura corporal ni glucemia en esta medición.',
        ...ACTIONS.REVIEW_INPUT,
        reasons: ['Agregar temperatura o glucemia según disponibilidad del protocolo.'],
        reference: REFERENCES.BODY,
        coverage: sysCov,
        metricsSummary: 'Sin temperatura ni glucemia',
      },
      traces,
    };
  }

  let status: HealthStatus = STATUS.GREEN;
  const reasons: string[] = [];
  let chosenAction: ActionRecommendation = ACTIONS.HYDRATE;
  let ref = REFERENCES.BODY;

  if (temp !== undefined) {
    const tBase = baselines.temperature;
    if (temp >= 38.0 || temp < 35.0) {
      status = elevateStatus(status, STATUS.RED);
      reasons.push(temp >= 38.0 ? `Fiebre (${temp} °C >= 38.0 °C).` : `Hipotermia crítica (${temp} °C < 35.0 °C).`);
      chosenAction = ACTIONS.ISOLATE;
      ref = REFERENCES.FEVER;
      traces.push(makeRuleTrace({
        ruleId: 'BODY_TEMP_CRITICAL',
        title: 'Temperatura crítica febril o hipotérmica',
        inputsUsed: ['temperature', 'context.tempMethod'],
        thresholdApplied: '>= 38.0 °C o < 35.0 °C',
        baselineComparison: tBase?.summaryText,
        exclusions: 'Confirmar con método consistente tras 15 min sin ingesta caliente/fría',
        followUpWindow: '1–2 horas',
        sourceKey: 'medline_fever',
      }));
    } else if (temp >= 37.5 || temp < 35.8) {
      status = elevateStatus(status, STATUS.YELLOW);
      reasons.push(temp >= 37.5 ? `Febrícula (${temp} °C).` : `Temperatura baja (${temp} °C < 35.8 °C).`);
      chosenAction = ACTIONS.ISOLATE;
      ref = REFERENCES.FEVER;
      traces.push(makeRuleTrace({
        ruleId: 'BODY_TEMP_WATCH',
        title: 'Temperatura limítrofe',
        inputsUsed: ['temperature', 'context.tempMethod'],
        thresholdApplied: '37.5–37.9 °C o 35.0–35.7 °C',
        baselineComparison: tBase?.summaryText,
        exclusions: 'Variación matutina oral >=35.8 °C se tolera en reposo basal',
        followUpWindow: '2 horas',
        sourceKey: 'medline_fever',
      }));
    }
  }

  if (gluc !== undefined) {
    const gBase = baselines.glucose;
    const isFasting = context.glucoseTiming === 'fasting';
    if (gluc < 54 || (gluc < 60 && (context.confirmedRepeated || context.symptoms.length > 0)) || gluc >= 200) {
      status = elevateStatus(status, STATUS.RED);
      reasons.push(gluc < 60 ? `Hipoglucemia crítica (${gluc} mg/dL).` : `Hiperglucemia crítica (${gluc} mg/dL >= 200).`);
      chosenAction = ACTIONS.COMMS;
      ref = REFERENCES.GLUCOSE;
      traces.push(makeRuleTrace({
        ruleId: 'BODY_GLUCOSE_CRITICAL',
        title: 'Disglucemia crítica',
        inputsUsed: ['glucose', 'context.glucoseTiming'],
        thresholdApplied: '<54 mg/dL, <60 confirmada/sintomática o >=200 mg/dL',
        baselineComparison: gBase?.summaryText,
        exclusions: 'En muestra sérica diferida sin síntoma, confirmar glucemia capilar',
        followUpWindow: '15–60 min',
        sourceKey: 'niddk_glucose',
      }));
    } else if (gluc < 70) {
      status = elevateStatus(status, STATUS.YELLOW);
      reasons.push(`Glucemia baja (${gluc} mg/dL < 70). Confirmar contexto/síntomas.`);
      chosenAction = ACTIONS.REVIEW_INPUT;
      ref = REFERENCES.GLUCOSE;
    } else if ((isFasting && gluc >= 100) || (!isFasting && gluc >= 140)) {
      status = elevateStatus(status, STATUS.YELLOW);
      reasons.push(isFasting ? `Glucemia en ayunas elevada (${gluc} mg/dL >= 100).` : `Glucemia elevada (${gluc} mg/dL; contexto: ${context.glucoseTiming}).`);
      chosenAction = ACTIONS.REVIEW_INPUT;
      ref = REFERENCES.GLUCOSE;
      traces.push(makeRuleTrace({
        ruleId: 'BODY_GLUCOSE_ELEVATED',
        title: 'Glucemia elevada contextualizada según ayuno',
        inputsUsed: ['glucose', 'context.glucoseTiming'],
        thresholdApplied: isFasting ? '>=100 mg/dL ayunas' : '>=140 mg/dL sin ayuno/desconocido',
        baselineComparison: gBase?.summaryText,
        exclusions: '100–139 mg/dL sin ayuno confirmado evita falsa alarma',
        followUpWindow: 'Confirmar en próximo ayuno (>=8 h)',
        sourceKey: 'niddk_glucose',
      }));
    }
  }

  return {
    evaluation: {
      systemId: 'body',
      systemName: 'Cuerpo y Metabolismo',
      systemIcon: 'shield',
      status,
      label: STATUS_LABELS[status],
      title: status === STATUS.RED ? 'Alerta metabólica / térmica prioritaria' : status === STATUS.YELLOW ? 'Seguimiento térmico / glucémico' : 'Termorregulación y metabolismo estables',
      message: reasons.length > 0 ? reasons.join(' ') : 'Temperatura y/o glucemia dentro de criterios operativos para el contexto indicado.',
      ...chosenAction,
      reasons: reasons.length > 0 ? reasons : [`Temp ${temp ?? '—'} °C · Gluc ${gluc ?? '—'} mg/dL (${context.glucoseTiming}).`],
      reference: ref,
      coverage: sysCov,
      metricsSummary: [temp !== undefined ? `${temp} °C` : null, gluc !== undefined ? `${gluc} mg/dL` : null].filter(Boolean).join(' · '),
    },
    traces,
  };
}
