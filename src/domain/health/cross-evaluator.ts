import type { ObservationContext } from '../nasa/nasa-types';
import { makeRuleTrace } from './rules-catalog';
import {
  ACTIONS,
  ConclusionCard,
  HealthStatus,
  PartialVitalValues,
  REFERENCES,
  STATUS,
  STATUS_RANK,
  SystemEvaluation,
  SystemId,
} from './vital-specs';

export function getWorstStatus(
  systems: Record<SystemId, SystemEvaluation>,
  triggeredCrosses: ConclusionCard[]
): HealthStatus {
  const evaluated = (Object.values(systems) as SystemEvaluation[]).filter(
    (s) => s.status !== STATUS.INSUFFICIENT_DATA
  );
  if (evaluated.length === 0) return STATUS.INSUFFICIENT_DATA;

  let worst: HealthStatus = STATUS.GREEN;
  for (const sys of evaluated) {
    if (STATUS_RANK[sys.status] > STATUS_RANK[worst]) worst = sys.status;
  }
  for (const cross of triggeredCrosses) {
    if (STATUS_RANK[cross.status] > STATUS_RANK[worst]) worst = cross.status;
  }
  return worst;
}

export function evaluateCrosses(
  vitals: PartialVitalValues,
  context: ObservationContext,
  systems: Record<SystemId, SystemEvaluation>
): { crossConclusion: ConclusionCard; triggeredCrosses: ConclusionCard[] } {
  const triggered: ConclusionCard[] = [];
  const hr = typeof vitals.heart_rate === 'number' ? vitals.heart_rate : undefined;
  const sbp = typeof vitals.bp_systolic === 'number' ? vitals.bp_systolic : undefined;
  const temp = typeof vitals.temperature === 'number' ? vitals.temperature : undefined;
  const gluc = typeof vitals.glucose === 'number' ? vitals.glucose : undefined;
  const sleep = typeof vitals.sleep_hours === 'number' ? vitals.sleep_hours : undefined;
  const mood = vitals.mood ?? undefined;

  const isTilt = context.activityState === 'orthostatic_tilt' || context.posture === 'standing_tilt';
  const isActive = context.activityState === 'post_exercise' || context.activityState === 'eva';
  const hasCvSymptoms = context.symptoms.some((s) => /mareo|palpit/i.test(s));

  if (temp !== undefined && temp >= 37.5 && hr !== undefined && hr >= 95) {
    const isRed = temp >= 38.0 || hr >= 115;
    triggered.push({
      id: 'immune_fever',
      status: isRed ? STATUS.RED : STATUS.YELLOW,
      label: isRed ? 'Prioridad Alta' : 'Seguimiento',
      title: 'Respuesta febril con sobrecarga cardiovascular',
      message: `Temperatura ${temp} °C combinada con pulso de ${hr} lpm.`,
      ...ACTIONS.ISOLATE,
      reasons: [`Temperatura ${temp} °C (>=37.5)`, `FC ${hr} lpm (>=95)`],
      reference: REFERENCES.FEVER,
      ruleTrace: makeRuleTrace({
        ruleId: 'CROSS_IMMUNE_FEVER',
        title: 'Correlación térmica y cardiovascular',
        inputsUsed: ['temperature', 'heart_rate'],
        thresholdApplied: 'temperature >= 37.5 °C y heart_rate >= 95 lpm',
        exclusions: 'Verificar método térmico y reposo real',
        followUpWindow: '1–2 horas',
        sourceKey: 'medline_fever',
      }),
    });
  }

  if (hr !== undefined && sbp !== undefined && hr >= 100 && sbp < 98 && (!isActive || sbp < 90)) {
    const severe =
      sbp < 88 ||
      (!isActive && !isTilt && hr >= 120) ||
      ((isActive || isTilt) && hr >= 165) ||
      hasCvSymptoms;
    triggered.push({
      id: 'orthostatic_fluid_strain',
      status: severe ? STATUS.RED : STATUS.YELLOW,
      label: severe ? 'Prioridad Alta' : 'Estrés ortostático',
      title: isTilt ? 'Estrés ortostático confirmado en prueba Tilt' : 'Pulso elevado con presión sistólica limítrofe/baja',
      message: `FC ${hr} lpm con PA sistólica ${sbp} mmHg (${context.posture}). Patrón compatible con estrés ortostático o menor volumen efectivo; confirmar postura e ingesta hídrica antes de concluir etiología.`,
      ...ACTIONS.HYDRATE,
      reasons: [`FC ${hr} lpm (>=100)`, `PA sistólica ${sbp} mmHg (<98)`, `Postura: ${context.posture}`],
      reference: REFERENCES.BODY,
      ruleTrace: makeRuleTrace({
        ruleId: 'CROSS_ORTHOSTATIC_STRAIN',
        title: 'Patrón hemodinámico FC alta + SBP baja (NASA HRP)',
        inputsUsed: ['heart_rate', 'bp_systolic', 'context.posture'],
        thresholdApplied: 'heart_rate >= 100 lpm y bp_systolic < 98 mmHg',
        exclusions: 'No asume hipovolemia aislada sin confirmar postura ni hidratación',
        followUpWindow: '10–15 min en reposo',
        sourceKey: 'nasa_orthostatic',
      }),
    });
  }

  if (sleep !== undefined && sleep < 6.0 && ((mood === 'cansado' || mood === 'estresado' || mood === 'agotado') || (hr !== undefined && hr >= 95 && !isActive))) {
    const isRed = sleep < 5.0 || mood === 'agotado';
    triggered.push({
      id: 'fatigue_overload',
      status: isRed ? STATUS.RED : STATUS.YELLOW,
      label: isRed ? 'Sobrecarga crítica' : 'Fatiga acumulada',
      title: 'Sobrecarga neuroconductual por déficit de sueño',
      message: `Sueño de ${sleep} h combinado con ${mood ? `ánimo ${mood}` : `FC ${hr} lpm en reposo`}.`,
      ...ACTIONS.SLEEP,
      reasons: [`Sueño ${sleep} h (<6.0)`, mood ? `Ánimo ${mood}` : `FC ${hr} lpm`],
      reference: REFERENCES.MIND,
      ruleTrace: makeRuleTrace({
        ruleId: 'CROSS_FATIGUE_OVERLOAD',
        title: 'Déficit de sueño con fatiga o respuesta autonómica',
        inputsUsed: ['sleep_hours', ...(mood ? ['mood'] : ['heart_rate'])],
        thresholdApplied: 'sleep_hours < 6.0 h con fatiga o FC >= 95',
        exclusions: 'Revisar calidad de sueño / movimientos en actigrafía',
        followUpWindow: 'Ciclo de sueño inmediato',
        sourceKey: 'nasa_sleep',
      }),
    });
  }

  if (gluc !== undefined && gluc < 70 && ((sbp !== undefined && sbp < 95) || (hr !== undefined && hr >= 100))) {
    triggered.push({
      id: 'hypoglycemic_stress',
      status: gluc < 60 ? STATUS.RED : STATUS.YELLOW,
      label: 'Riesgo metabólico',
      title: 'Glucemia baja asociada a estrés autonómico',
      message: `Glucosa ${gluc} mg/dL coexistiendo con respuesta adrenérgica (${hr ?? '—'} lpm / ${sbp ?? '—'} mmHg).`,
      ...ACTIONS.COMMS,
      reasons: [`Glucemia ${gluc} mg/dL (<70)`],
      reference: REFERENCES.GLUCOSE,
      ruleTrace: makeRuleTrace({
        ruleId: 'CROSS_HYPOGLYCEMIC_STRESS',
        title: 'Glucemia <70 mg/dL con estrés hemodinámico',
        inputsUsed: ['glucose', 'heart_rate', 'bp_systolic'],
        thresholdApplied: 'glucose < 70 mg/dL + SBP < 95 o FC >= 100',
        exclusions: 'Confirmar glucemia capilar si proviene de química sérica',
        followUpWindow: '15 minutos',
        sourceKey: 'niddk_glucose',
      }),
    });
  }

  if (triggered.length > 0) {
    triggered.sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status]);
    return { crossConclusion: triggered[0], triggeredCrosses: triggered };
  }

  const evaluated = (Object.values(systems) as SystemEvaluation[]).filter(
    (s) => s.status !== STATUS.INSUFFICIENT_DATA
  );

  if (evaluated.length === 0) {
    return {
      crossConclusion: {
        id: null,
        status: STATUS.INSUFFICIENT_DATA,
        label: 'Sin lectura',
        title: 'Sin indicadores fisiológicos evaluables',
        message: 'Ingresa al menos un indicador válido para iniciar la evaluación.',
        ...ACTIONS.REVIEW_INPUT,
        reasons: [],
        reference: REFERENCES.CSA,
      },
      triggeredCrosses: [],
    };
  }

  const worstSys = [...evaluated].sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status])[0];
  if (worstSys.status === STATUS.RED || worstSys.status === STATUS.YELLOW) {
    return {
      crossConclusion: {
        id: `system_${worstSys.systemId}`,
        status: worstSys.status,
        label: worstSys.label,
        title: worstSys.title,
        message: worstSys.message,
        actionIcon: worstSys.actionIcon,
        actionText: worstSys.actionText,
        reasons: worstSys.reasons,
        reference: worstSys.reference,
      },
      triggeredCrosses: [],
    };
  }

  return {
    crossConclusion: {
      id: null,
      status: STATUS.GREEN,
      label: 'Operativo',
      title: 'Sistemas evaluados dentro de rango operativo',
      message: 'Sin alertas activas en los indicadores medidos; mantén vigilancia preventiva.',
      ...ACTIONS.HYDRATE,
      reasons: ['Sistemas con datos dentro de criterios operativos.'],
      reference: REFERENCES.CSA,
    },
    triggeredCrosses: [],
  };
}
