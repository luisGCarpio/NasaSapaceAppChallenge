import type { ObservationContext } from '../nasa/nasa-types';
import type { BaselineMap } from './baseline-analyzer';
import type { CoverageSummary } from './context-specs';
import { makeRuleTrace, type RuleAuditTrace } from './rules-catalog';
import {
  ACTIONS,
  ActionRecommendation,
  HealthStatus,
  PartialVitalValues,
  REFERENCES,
  STATUS,
  STATUS_LABELS,
  STATUS_RANK,
  SystemEvaluation,
} from './vital-specs';

export { evaluateBody } from './system-body';

export interface SystemEvalOutput {
  evaluation: SystemEvaluation;
  traces: RuleAuditTrace[];
}

export function elevateStatus(current: HealthStatus, next: HealthStatus): HealthStatus {
  return STATUS_RANK[next] > STATUS_RANK[current] ? next : current;
}

export function pickFinite(v: number | null | undefined): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function evaluateMind(
  vitals: PartialVitalValues,
  _context: ObservationContext,
  baselines: BaselineMap,
  coverage?: CoverageSummary
): SystemEvalOutput {
  const sysCov = coverage?.systemCoverage.mind;
  const traces: RuleAuditTrace[] = [];
  const sleep = pickFinite(vitals.sleep_hours);
  const mood = vitals.mood ?? undefined;

  if (sleep === undefined && !mood) {
    return {
      evaluation: {
        systemId: 'mind',
        systemName: 'Mente y Sueño',
        systemIcon: 'brain',
        status: STATUS.INSUFFICIENT_DATA,
        label: STATUS_LABELS.INSUFFICIENT_DATA,
        title: 'Sin datos de sueño ni ánimo',
        message: 'No se registraron horas de sueño ni estado de ánimo en esta toma.',
        ...ACTIONS.REVIEW_INPUT,
        reasons: ['Indicadores mentales ausentes; otros sistemas pueden seguir evaluándose.'],
        reference: REFERENCES.MIND,
        coverage: sysCov,
        metricsSummary: 'Sin sueño ni ánimo registrados',
      },
      traces,
    };
  }

  let status: HealthStatus = STATUS.GREEN;
  const reasons: string[] = [];
  let chosenAction: ActionRecommendation = ACTIONS.SLEEP;

  if (sleep !== undefined) {
    const base = baselines.sleep_hours;
    if (sleep < 5.0 || (sleep <= 5.5 && (mood === 'agotado' || mood === 'estresado'))) {
      status = elevateStatus(status, STATUS.RED);
      reasons.push(`Déficit crítico de sueño (${sleep} h < 5.0 h${mood ? `, ánimo ${mood}` : ''}).`);
      traces.push(makeRuleTrace({
        ruleId: 'MIND_SLEEP_CRITICAL',
        title: 'Restricción severa de sueño / carga neuroconductual',
        inputsUsed: ['sleep_hours', ...(mood ? ['mood'] : [])],
        thresholdApplied: 'sleep_hours < 5.0 h o <=5.5 h con agotamiento/estrés',
        baselineComparison: base?.summaryText,
        exclusions: 'Siestas no declaradas en actigrafía',
        followUpWindow: 'Siguiente ciclo de descanso (8–12 h)',
        sourceKey: 'nasa_sleep',
      }));
    } else if (sleep < 7.0 || sleep > 10.5) {
      status = elevateStatus(status, STATUS.YELLOW);
      reasons.push(sleep < 7.0 ? `Sueño reducido (${sleep} h; objetivo 7.0–9.0 h).` : `Sueño prolongado atípico (${sleep} h).`);
      traces.push(makeRuleTrace({
        ruleId: 'MIND_SLEEP_SUBOPTIMAL',
        title: 'Sueño fuera de rango operativo (7.0–9.0 h)',
        inputsUsed: ['sleep_hours'],
        thresholdApplied: 'sleep_hours < 7.0 h o > 10.5 h',
        baselineComparison: base?.summaryText,
        exclusions: 'Ninguna',
        followUpWindow: '24 h',
        sourceKey: 'nasa_sleep',
      }));
    } else if (base?.significantDrift && (base.deltaFromMedian ?? 0) <= -1.2) {
      status = elevateStatus(status, STATUS.YELLOW);
      reasons.push(`Caída de sueño frente a tu mediana personal (${sleep} h vs ${base.median} h).`);
    }
  }

  if (mood) {
    if (mood === 'agotado') {
      status = elevateStatus(status, STATUS.RED);
      reasons.push('Estado anímico reportado: agotado.');
      chosenAction = ACTIONS.SLEEP;
    } else if (mood === 'cansado' || mood === 'estresado') {
      status = elevateStatus(status, STATUS.YELLOW);
      reasons.push(`Carga subjetiva reportada: ${mood}.`);
      chosenAction = ACTIONS.BREATHE;
    }
  }

  return {
    evaluation: {
      systemId: 'mind',
      systemName: 'Mente y Sueño',
      systemIcon: 'brain',
      status,
      label: STATUS_LABELS[status],
      title: status === STATUS.RED ? 'Déficit cognitivo / de descanso prioritario' : status === STATUS.YELLOW ? 'Vigilancia de descanso y carga' : 'Sueño y ánimo estables',
      message: reasons.length > 0 ? reasons.join(' ') : 'Descanso y carga cognitiva dentro de parámetros operativos.',
      ...(status === STATUS.GREEN ? ACTIONS.BREATHE : chosenAction),
      reasons: reasons.length > 0 ? reasons : [`Sueño ${sleep ?? '—'} h${mood ? `, ánimo ${mood}` : ''}.`],
      reference: REFERENCES.MIND,
      coverage: sysCov,
      metricsSummary: [sleep !== undefined ? `${sleep} h` : null, mood ?? null].filter(Boolean).join(' · '),
    },
    traces,
  };
}
