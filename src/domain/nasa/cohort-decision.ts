import type { HealthEvaluation, PartialVitalValues } from '@/domain/health';
import type { ObservationContext } from './nasa-types';

export type NasaMissionTriageLevel =
  | 'LEVEL_0_AUTONOMOUS_NOMINAL'
  | 'LEVEL_1_ONBOARD_COUNTERMEASURE'
  | 'LEVEL_2_EARTH_INTERVENTION'
  | 'LEVEL_3_MISSION_ABORT_OR_RETURN'
  | 'INSUFFICIENT_TELEMETRY';

export type GravityStressMode = 'post_bedrest_median' | 'post_bedrest_p25_vulnerable';

export type LandingReadinessVerdict =
  | 'GO_FOR_LANDING'
  | 'COUNTERMEASURE_REQUIRED_BEFORE_LANDING'
  | 'PRESYNCOPE_ABORT_RISK'
  | 'INSUFFICIENT_CARDIO_DATA';

export interface CohortPercentileSpec {
  field: 'heart_rate' | 'bp_systolic' | 'bp_diastolic' | 'temperature' | 'glucose' | 'sleep_hours';
  label: string;
  unit: string;
  studySource: string;
  sampleSize: number;
  p5: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface NasaVitalCohortComparison {
  field: CohortPercentileSpec['field'];
  label: string;
  unit: string;
  value: number;
  estimatedPercentile: number;
  cohortMedian: number;
  cohortP10: number;
  cohortP90: number;
  studySource: string;
  sampleSize: number;
  zone: 'nominal_p10_p90' | 'watch_tail' | 'extreme_outlier';
  summaryText: string;
}

export interface GravitySimulationResult {
  mode: GravityStressMode;
  modeLabel: string;
  referenceStudy: string;
  pairedSessionsCount: number;
  verdict: LandingReadinessVerdict;
  verdictTitle: string;
  verdictSummary: string;
  baselinePosture: string;
  currentHr: number | null;
  currentSbp: number | null;
  currentDbp: number | null;
  projectedTiltHr: number | null;
  projectedTiltSbp: number | null;
  projectedTiltDbp: number | null;
  projectedPulsePressure: number | null;
  appliedDeltaHr: number;
  appliedDeltaSbp: number;
  appliedDeltaDbp: number;
  tiltCohortHrMedian: number;
  tiltCohortHrP90: number;
  countermeasuresRequired: string[];
}

export interface NasaOperationalDecision {
  triageLevel: NasaMissionTriageLevel;
  badgeText: string;
  title: string;
  operationalVerdict: string;
  requiresEarthIntervention: boolean;
  evaCleared: boolean;
  returnToGravityReady: boolean;
  cohortComparisons: NasaVitalCohortComparison[];
  gravitySimulation: GravitySimulationResult;
  recommendedActions: string[];
  symptomCohortBreakdown: {
    totalEvents: number;
    observationOnly: number;
    onboardNursingSupport: number;
    onboardMedicationKit: number;
    flightSurgeonNotified: number;
    matchingHistoricalTier: string;
  };
}

/**
 * Distribuciones empíricas extraídas directamente de `data/nasa-normalized/observations.json`
 * (3,965 observaciones auditadas de NASA OSDR y NASA NLSP).
 */
export const NASA_COHORT_SPECS: Record<CohortPercentileSpec['field'], CohortPercentileSpec> = {
  heart_rate: {
    field: 'heart_rate',
    label: 'Pulso (FC)',
    unit: 'bpm',
    studySource: 'NASA NLSP CRF_C3_VITALS',
    sampleSize: 2442,
    p5: 53,
    p10: 57,
    p25: 64,
    p50: 70,
    p75: 79,
    p90: 89,
    p95: 95,
    p99: 105,
  },
  bp_systolic: {
    field: 'bp_systolic',
    label: 'PA Sistólica',
    unit: 'mmHg',
    studySource: 'NASA NLSP CRF_C3_VITALS',
    sampleSize: 2449,
    p5: 99,
    p10: 102,
    p25: 108,
    p50: 115,
    p75: 124,
    p90: 131,
    p95: 135,
    p99: 142,
  },
  bp_diastolic: {
    field: 'bp_diastolic',
    label: 'PA Diastólica',
    unit: 'mmHg',
    studySource: 'NASA NLSP CRF_C3_VITALS',
    sampleSize: 2449,
    p5: 57,
    p10: 60,
    p25: 65,
    p50: 71,
    p75: 77,
    p90: 83,
    p95: 86,
    p99: 92,
  },
  temperature: {
    field: 'temperature',
    label: 'Temperatura',
    unit: '°C',
    studySource: 'NASA NLSP CRF_C3_VITALS',
    sampleSize: 2449,
    p5: 35.9,
    p10: 36.1,
    p25: 36.3,
    p50: 36.5,
    p75: 36.8,
    p90: 37.0,
    p95: 37.1,
    p99: 37.3,
  },
  glucose: {
    field: 'glucose',
    label: 'Glucosa sérica',
    unit: 'mg/dL',
    studySource: 'NASA MR010G_C3_LAB + OSD-575',
    sampleSize: 248,
    p5: 68,
    p10: 73,
    p25: 79,
    p50: 84,
    p75: 88,
    p90: 92,
    p95: 94,
    p99: 99,
  },
  sleep_hours: {
    field: 'sleep_hours',
    label: 'Sueño objetivo',
    unit: 'h',
    studySource: 'NASA NLSP BRSMACT_C1_SLEEP',
    sampleSize: 190,
    p5: 6.07,
    p10: 6.57,
    p25: 7.02,
    p50: 7.37,
    p75: 7.55,
    p90: 7.67,
    p95: 7.73,
    p99: 7.91,
  },
};

export function estimateEmpiricalPercentile(value: number, spec: CohortPercentileSpec): number {
  const knots: Array<[number, number]> = [
    [spec.p5, 5],
    [spec.p10, 10],
    [spec.p25, 25],
    [spec.p50, 50],
    [spec.p75, 75],
    [spec.p90, 90],
    [spec.p95, 95],
    [spec.p99, 99],
  ];

  if (value <= knots[0][0]) {
    return value < knots[0][0] ? 2 : 5;
  }
  if (value >= knots[knots.length - 1][0]) {
    return 99;
  }

  for (let i = 0; i < knots.length - 1; i++) {
    const [v0, p0] = knots[i];
    const [v1, p1] = knots[i + 1];
    if (value >= v0 && value <= v1) {
      if (v1 === v0) return p1;
      const ratio = (value - v0) / (v1 - v0);
      return Math.round(p0 + ratio * (p1 - p0));
    }
  }
  return 50;
}

export function buildCohortComparisons(vitals: PartialVitalValues): NasaVitalCohortComparison[] {
  const fields: Array<CohortPercentileSpec['field']> = [
    'heart_rate',
    'bp_systolic',
    'bp_diastolic',
    'temperature',
    'glucose',
    'sleep_hours',
  ];

  const results: NasaVitalCohortComparison[] = [];

  for (const field of fields) {
    const rawVal = vitals[field];
    if (typeof rawVal !== 'number' || !Number.isFinite(rawVal)) continue;

    const spec = NASA_COHORT_SPECS[field];
    const pct = estimateEmpiricalPercentile(rawVal, spec);

    let zone: NasaVitalCohortComparison['zone'] = 'nominal_p10_p90';
    if (rawVal < spec.p5 || rawVal > spec.p95) {
      zone = 'extreme_outlier';
    } else if (rawVal < spec.p10 || rawVal > spec.p90) {
      zone = 'watch_tail';
    }

    const diffFromMedian = Number((rawVal - spec.p50).toFixed(1));
    const sign = diffFromMedian > 0 ? `+${diffFromMedian}` : `${diffFromMedian}`;

    results.push({
      field,
      label: spec.label,
      unit: spec.unit,
      value: rawVal,
      estimatedPercentile: pct,
      cohortMedian: spec.p50,
      cohortP10: spec.p10,
      cohortP90: spec.p90,
      studySource: spec.studySource,
      sampleSize: spec.sampleSize,
      zone,
      summaryText: `P${pct} en cohorte NASA (${sign} ${spec.unit} vs mediana ${spec.p50}; rango P10–P90: ${spec.p10}–${spec.p90} ${spec.unit})`,
    });
  }

  return results;
}

/**
 * Simulador de Estrés de Aterrizaje / Paso a Gravedad basado en las 78 sesiones pareadas
 * Supine -> Standing Tilt del estudio oficial NASA NLSP `MR001G_C3_TILT` (41 pares POST_TEST).
 */
export function simulateGravityReentryStress(
  vitals: PartialVitalValues,
  context?: Partial<ObservationContext>,
  mode: GravityStressMode = 'post_bedrest_median'
): GravitySimulationResult {
  const hr = typeof vitals.heart_rate === 'number' ? vitals.heart_rate : null;
  const sbp = typeof vitals.bp_systolic === 'number' ? vitals.bp_systolic : null;
  const dbp = typeof vitals.bp_diastolic === 'number' ? vitals.bp_diastolic : null;
  const alreadyTilted =
    context?.activityState === 'orthostatic_tilt' || context?.posture === 'standing_tilt';

  // Deltas empíricos Supine -> Tilt medidos en POST_TEST de MR001G_C3_TILT (n=41 pares post-microgravedad):
  // Mediana (P50): dHr = +60 bpm, dSbp = +2 mmHg, dDbp = 0 mmHg
  // Cuartil vulnerable (P75 dHr / P25 dSbp & dDbp): dHr = +69 bpm, dSbp = -16 mmHg, dDbp = -15 mmHg
  const deltaHr = alreadyTilted ? 0 : mode === 'post_bedrest_median' ? 60 : 69;
  const deltaSbp = alreadyTilted ? 0 : mode === 'post_bedrest_median' ? 2 : -16;
  const deltaDbp = alreadyTilted ? 0 : mode === 'post_bedrest_median' ? 0 : -15;

  const modeLabel =
    mode === 'post_bedrest_median'
      ? 'Reentrada Estándar (Mediana POST_TEST MR001G: +60 bpm / +2 mmHg PAS / 0 mmHg PAD)'
      : 'Desacondicionamiento Severo (Cuartil Vulnerable P75/P25 POST_TEST MR001G: +69 bpm / -16 mmHg PAS / -15 mmHg PAD)';

  if (hr === null && sbp === null) {
    return {
      mode,
      modeLabel,
      referenceStudy: 'NASA NLSP MR001G_C3_TILT (78 sesiones Supine→Tilt, 26 sujetos)',
      pairedSessionsCount: 78,
      verdict: 'INSUFFICIENT_CARDIO_DATA',
      verdictTitle: 'Sin datos cardiovasculares para simular retorno a gravedad',
      verdictSummary:
        'Activa Frecuencia Cardíaca y/o Presión Arterial para proyectar la respuesta ortostática de aterrizaje según MR001G_C3_TILT.',
      baselinePosture: context?.posture ?? 'supine',
      currentHr: null,
      currentSbp: null,
      currentDbp: null,
      projectedTiltHr: null,
      projectedTiltSbp: null,
      projectedTiltDbp: null,
      projectedPulsePressure: null,
      appliedDeltaHr: deltaHr,
      appliedDeltaSbp: deltaSbp,
      appliedDeltaDbp: deltaDbp,
      tiltCohortHrMedian: 131,
      tiltCohortHrP90: 163,
      countermeasuresRequired: ['Medir FC y PA en reposo antes de autorizar maniobra de reentrada o EVA.'],
    };
  }

  const projectedTiltHr = hr !== null ? Math.round(hr + deltaHr) : null;
  const projectedTiltSbp = sbp !== null ? Math.round(sbp + deltaSbp) : null;
  const projectedTiltDbp = dbp !== null ? Math.round(dbp + deltaDbp) : null;
  const projectedPulsePressure =
    projectedTiltSbp !== null && projectedTiltDbp !== null
      ? projectedTiltSbp - projectedTiltDbp
      : null;

  const highSyncopeRisk =
    (projectedTiltHr !== null && projectedTiltHr >= 148) ||
    (projectedTiltSbp !== null && projectedTiltSbp < 94) ||
    (projectedPulsePressure !== null && projectedPulsePressure <= 22);

  const moderateStrain =
    !highSyncopeRisk &&
    ((projectedTiltHr !== null && projectedTiltHr >= 132) ||
      (projectedTiltSbp !== null && projectedTiltSbp < 104) ||
      (projectedPulsePressure !== null && projectedPulsePressure <= 28));

  if (highSyncopeRisk) {
    return {
      mode,
      modeLabel,
      referenceStudy: 'NASA NLSP MR001G_C3_TILT (78 sesiones Supine→Tilt, 26 sujetos)',
      pairedSessionsCount: 78,
      verdict: 'PRESYNCOPE_ABORT_RISK',
      verdictTitle: '🔴 ALTO RIESGO DE SÍNCOPE ORTOSTÁTICO AL ATERRIZAR / PISAR GRAVEDAD',
      verdictSummary: `Al aplicar la transición gravitatoria de MR001G_C3_TILT, la proyección alcanza ${
        projectedTiltHr !== null ? `FC ${projectedTiltHr} bpm` : 'FC N/D'
      }${
        projectedTiltSbp !== null && projectedTiltDbp !== null
          ? ` y PA ${projectedTiltSbp}/${projectedTiltDbp} mmHg (presión de pulso ${projectedPulsePressure} mmHg)`
          : ''
      }, perfil compatible con terminación temprana por presíncope en la cohorte UTMB.`,
      baselinePosture: alreadyTilted ? 'standing_tilt (ya bajo estrés ortostático)' : (context?.posture ?? 'supine'),
      currentHr: hr,
      currentSbp: sbp,
      currentDbp: dbp,
      projectedTiltHr,
      projectedTiltSbp,
      projectedTiltDbp,
      projectedPulsePressure,
      appliedDeltaHr: deltaHr,
      appliedDeltaSbp: deltaSbp,
      appliedDeltaDbp: deltaDbp,
      tiltCohortHrMedian: 131,
      tiltCohortHrP90: 163,
      countermeasuresRequired: [
        'NO APTO para caminata planetaria (EVA) ni reentrada en bipedestación sin soporte.',
        'Activar carga salina oral/IV protocolizada + traje de compresión anti-G ( extremidades inferiores y abdomen ).',
        'Mantener postura reclinada durante reentrada y solicitar asistencia de recuperación en Tierra.',
      ],
    };
  }

  if (moderateStrain) {
    return {
      mode,
      modeLabel,
      referenceStudy: 'NASA NLSP MR001G_C3_TILT (78 sesiones Supine→Tilt, 26 sujetos)',
      pairedSessionsCount: 78,
      verdict: 'COUNTERMEASURE_REQUIRED_BEFORE_LANDING',
      verdictTitle: '🟡 TOLERANCIA ORTOSTÁTICA LÍMITE — REQUIERE CONTRAMEDIDA PRE-REENTRADA',
      verdictSummary: `Bajo estrés de gravedad MR001G_C3_TILT se proyecta ${
        projectedTiltHr !== null ? `FC ${projectedTiltHr} bpm (mediana Tilt NASA: 131 bpm)` : 'FC N/D'
      }${
        projectedTiltSbp !== null && projectedTiltDbp !== null
          ? ` y PA ${projectedTiltSbp}/${projectedTiltDbp} mmHg`
          : ''
      }. Requiere carga hídrica-salina y prendas de compresión antes de reentrada o EVA.`,
      baselinePosture: alreadyTilted ? 'standing_tilt' : (context?.posture ?? 'supine'),
      currentHr: hr,
      currentSbp: sbp,
      currentDbp: dbp,
      projectedTiltHr,
      projectedTiltSbp,
      projectedTiltDbp,
      projectedPulsePressure,
      appliedDeltaHr: deltaHr,
      appliedDeltaSbp: deltaSbp,
      appliedDeltaDbp: deltaDbp,
      tiltCohortHrMedian: 131,
      tiltCohortHrP90: 163,
      countermeasuresRequired: [
        'Ejecutar protocolo de carga de fluidos isotónicos 2 h antes de reentrada o transición gravitatoria.',
        'Activar prenda de compresión de tren inferior y repetir toma cardiovascular en 30 min.',
      ],
    };
  }

  return {
    mode,
    modeLabel,
    referenceStudy: 'NASA NLSP MR001G_C3_TILT (78 sesiones Supine→Tilt, 26 sujetos)',
    pairedSessionsCount: 78,
    verdict: 'GO_FOR_LANDING',
    verdictTitle: '🟢 APTO PARA RETORNO A GRAVEDAD Y OPERACIÓN PLANETARIA',
    verdictSummary: `Proyección bajo estrés gravitatorio MR001G_C3_TILT dentro de margen seguro (${
      projectedTiltHr !== null ? `FC proyectada ${projectedTiltHr} bpm vs P50 Tilt NASA 131 bpm` : 'FC nominal'
    }${
      projectedTiltSbp !== null && projectedTiltDbp !== null
        ? `; PA proyectada ${projectedTiltSbp}/${projectedTiltDbp} mmHg`
        : ''
    }). Reserva hemodinámica suficiente para transición a gravedad.`,
    baselinePosture: alreadyTilted ? 'standing_tilt' : (context?.posture ?? 'supine'),
    currentHr: hr,
    currentSbp: sbp,
    currentDbp: dbp,
    projectedTiltHr,
    projectedTiltSbp,
    projectedTiltDbp,
    projectedPulsePressure,
    appliedDeltaHr: deltaHr,
    appliedDeltaSbp: deltaSbp,
    appliedDeltaDbp: deltaDbp,
    tiltCohortHrMedian: 131,
    tiltCohortHrP90: 163,
    countermeasuresRequired: [
      'Mantener hidratación basal de misión y contramedida aeróbica/resistiva habitual.',
    ],
  };
}

/**
 * Motor de Decisión Operativa que integra:
 * 1) Percentiles empíricos frente a los datasets NASA (`CRF_C3_VITALS`, `MR010G_C3_LAB`, `OSD-575`, `BRSMACT_C1_SLEEP`)
 * 2) Historial real de escalamiento clínico de `CRF_C3_SYMPTOMS` (921 eventos)
 * 3) Simulador de tolerancia al retorno a gravedad (`MR001G_C3_TILT`)
 */
export function evaluateNasaOperationalDecision(
  vitals: PartialVitalValues,
  evaluation: HealthEvaluation,
  context?: Partial<ObservationContext>,
  stressMode: GravityStressMode = 'post_bedrest_median'
): NasaOperationalDecision {
  const cohortComparisons = buildCohortComparisons(vitals);
  const gravitySimulation = simulateGravityReentryStress(vitals, context, stressMode);

  const symptomBase = {
    totalEvents: 921,
    observationOnly: 220,
    onboardNursingSupport: 123,
    onboardMedicationKit: 268,
    flightSurgeonNotified: 26,
  };

  if (evaluation.coverage.presentCount === 0) {
    return {
      triageLevel: 'INSUFFICIENT_TELEMETRY',
      badgeText: 'SIN TELEMETRÍA ACTIVA',
      title: 'Esperando signos vitales para comparar contra cohorte NASA',
      operationalVerdict:
        'Activa al menos un indicador en Controles del Cuerpo o selecciona un sujeto real NASA para determinar si se requiere intervención de Tierra o ajuste de misión.',
      requiresEarthIntervention: false,
      evaCleared: false,
      returnToGravityReady: false,
      cohortComparisons,
      gravitySimulation,
      recommendedActions: [
        'Registrar pulso, presión arterial, temperatura, glucosa o sueño para activar el triaje comparativo NASA.',
      ],
      symptomCohortBreakdown: {
        ...symptomBase,
        matchingHistoricalTier: 'Sin lecturas activas para emparejar con los 921 eventos de CRF_C3_SYMPTOMS.',
      },
    };
  }

  const extremeOutliers = cohortComparisons.filter((c) => c.zone === 'extreme_outlier');
  const watchTails = cohortComparisons.filter((c) => c.zone === 'watch_tail');

  const hasCriticalHypoglycemia = typeof vitals.glucose === 'number' && vitals.glucose < 55;
  const hasCriticalHyperglycemia = typeof vitals.glucose === 'number' && vitals.glucose >= 220;
  const hasCriticalFever = typeof vitals.temperature === 'number' && vitals.temperature >= 38.3;
  const hasCriticalHypothermia = typeof vitals.temperature === 'number' && vitals.temperature < 35.0;
  const hasSevereHypertension =
    (typeof vitals.bp_systolic === 'number' && vitals.bp_systolic >= 160) ||
    (typeof vitals.bp_diastolic === 'number' && vitals.bp_diastolic >= 100);
  const hasSevereHypotension =
    (typeof vitals.bp_systolic === 'number' && vitals.bp_systolic < 90) ||
    (typeof vitals.bp_diastolic === 'number' && vitals.bp_diastolic < 50);
  const hasRestingSevereTachy =
    typeof vitals.heart_rate === 'number' &&
    vitals.heart_rate >= 120 &&
    context?.activityState !== 'post_exercise' &&
    context?.activityState !== 'eva' &&
    context?.activityState !== 'orthostatic_tilt' &&
    context?.posture !== 'standing_tilt';

  // NIVEL 3: Aborto de Operación / Protocolo de Retorno o Estabilización Crítica
  if (
    hasCriticalHypoglycemia ||
    hasCriticalHyperglycemia ||
    hasCriticalFever ||
    hasCriticalHypothermia ||
    hasSevereHypertension ||
    hasSevereHypotension ||
    hasRestingSevereTachy ||
    (evaluation.overallStatus === 'RED' && gravitySimulation.verdict === 'PRESYNCOPE_ABORT_RISK')
  ) {
    return {
      triageLevel: 'LEVEL_3_MISSION_ABORT_OR_RETURN',
      badgeText: '🔴 NIVEL 3 · ABORTO OPERATIVO / INTERVENCIÓN INMEDIATA',
      title: 'Suspensión inmediata de misión extravehicular y protocolo de estabilización / retorno',
      operationalVerdict:
        'Los signos vitales superan los umbrales críticos de seguridad de la cohorte espacial NASA (fuera del P99 de CRF_C3_VITALS / extremos metabólicos de OSD-575) con alto riesgo de descompensación o síncope ortostático en gravedad (MR001G_C3_TILT). Requiere intervención inmediata del Flight Surgeon en Tierra y abortar actividades críticas.',
      requiresEarthIntervention: true,
      evaCleared: false,
      returnToGravityReady: false,
      cohortComparisons,
      gravitySimulation,
      recommendedActions: [
        'ABORTAR caminata espacial (EVA), ejercicio de carga y maniobras críticas de inmediato.',
        'Transmitir telemetría prioritaria a Control de Misión (Flight Surgeon en Tierra) para soporte médico directo.',
        'Si se proyecta reentrada o descenso planetario, mantener soporte reclinado y evaluar ventana de retorno médico.',
      ],
      symptomCohortBreakdown: {
        ...symptomBase,
        matchingHistoricalTier:
          'Corresponde al 2.8% crítico (26/921 casos de CRF_C3_SYMPTOMS donde fue obligatorio notificar al médico de estudio / Dr. Ware e intervenir de inmediato).',
      },
    };
  }

  // NIVEL 2: Intervención de la Tierra Requerida (Telemedicina con Flight Surgeon + Botiquín)
  if (
    evaluation.overallStatus === 'RED' ||
    extremeOutliers.length >= 2 ||
    (evaluation.overallStatus === 'YELLOW' && extremeOutliers.length >= 1) ||
    gravitySimulation.verdict === 'PRESYNCOPE_ABORT_RISK'
  ) {
    return {
      triageLevel: 'LEVEL_2_EARTH_INTERVENTION',
      badgeText: '🟠 NIVEL 2 · INTERVENCIÓN DE TIERRA REQUERIDA (FLIGHT SURGEON)',
      title: 'Escalamiento a Médico de Vuelo en Tierra y restricción de actividades físicas',
      operationalVerdict: `Se detectan ${extremeOutliers.length} indicador(es) en el extremo estadístico (>P95 o <P5) de la cohorte NASA (${extremeOutliers
        .map((c) => `${c.label}: P${c.estimatedPercentile}`)
        .join(', ') || 'alerta clínica activa'}). No basta el autocuidado aislado: se requiere consulta con Tierra para autorizar botiquín a bordo y pausar EVA.`,
      requiresEarthIntervention: true,
      evaCleared: false,
      returnToGravityReady:
        gravitySimulation.verdict === 'GO_FOR_LANDING' && evaluation.overallStatus !== 'RED',
      cohortComparisons,
      gravitySimulation,
      recommendedActions: [
        'Enviar paquete de telemetría a Tierra (botón "Avisar a Tierra") para revisión del Flight Surgeon.',
        'Bloquear ejercicio intenso y posponer actividades extravehiculares (EVA) hasta confirmación clínica.',
        'Confirmar lectura repetida en 15–30 min con contexto completo (reposo/ayuno) antes de administrar fármacos del botiquín.',
      ],
      symptomCohortBreakdown: {
        ...symptomBase,
        matchingHistoricalTier:
          'Coincide con los 268 casos de Medication Administered (29.1%) y 26 de Physician Notified (2.8%) en CRF_C3_SYMPTOMS que requirieron protocolo médico supervisado.',
      },
    };
  }

  // NIVEL 1: Contramedida Autónoma a Bordo (Sin intervención de la Tierra)
  if (
    evaluation.overallStatus === 'YELLOW' ||
    extremeOutliers.length === 1 ||
    watchTails.length >= 1 ||
    gravitySimulation.verdict === 'COUNTERMEASURE_REQUIRED_BEFORE_LANDING'
  ) {
    return {
      triageLevel: 'LEVEL_1_ONBOARD_COUNTERMEASURE',
      badgeText: '🔵 NIVEL 1 · CONTRAMEDIDA AUTÓNOMA A BORDO (SIN INTERVENCIÓN DE TIERRA)',
      title: 'Desviación fisiológica manejable a bordo sin escalar a Control de Misión',
      operationalVerdict:
        'Tus indicadores muestran una desviación leve/moderada respecto a la mediana de microgravedad NASA (P10–P90 de CRF_C3_VITALS / BRSMACT_C1_SLEEP), pero sin criterios de emergencia. El astronauta puede corregirlo autónomamente en la nave y reevaluar.',
      requiresEarthIntervention: false,
      evaCleared: !evaluation.clinicalRestrictions.restrictStrenuousExercise,
      returnToGravityReady: gravitySimulation.verdict === 'GO_FOR_LANDING',
      cohortComparisons,
      gravitySimulation,
      recommendedActions: [
        'Aplicar contramedida autónoma a bordo (hidratación oral, ajuste de descanso/sueño o pausa de respiración).',
        'No requiere despertar ni solicitar intervención urgente del médico en Tierra en este momento.',
        'Repetir medición de control en 60 minutos para verificar retorno al rango P10–P90 de la cohorte NASA.',
      ],
      symptomCohortBreakdown: {
        ...symptomBase,
        matchingHistoricalTier:
          'Compatible con los 123 casos de Nursing Intervention Administered (13.4%) y 220 de Assessment/Education (23.9%) en CRF_C3_SYMPTOMS resueltos con soporte local sin escalar al médico.',
      },
    };
  }

  // NIVEL 0: Autonomía Total / Nominal
  return {
    triageLevel: 'LEVEL_0_AUTONOMOUS_NOMINAL',
    badgeText: '🟢 NIVEL 0 · AUTONOMÍA TOTAL (DENTRO DE COHORTE NOMINAL NASA)',
    title: 'Parámetros alineados con la cohorte espacial NASA — Misión, EVA y retorno autorizados',
    operationalVerdict:
      'Todos los indicadores medidos se encuentran dentro de la banda intercuartil/nominal (P10–P90) de los estudios humanos de la NASA (CRF_C3_VITALS, MR010G_C3_LAB y BRSMACT_C1_SLEEP) y la simulación de gravedad MR001G_C3_TILT proyecta tolerancia ortostática adecuada.',
    requiresEarthIntervention: false,
    evaCleared: true,
    returnToGravityReady: gravitySimulation.verdict === 'GO_FOR_LANDING',
    cohortComparisons,
    gravitySimulation,
    recommendedActions: [
      'Continuar plan nominal de misión, experimentos y caminatas espaciales (EVA).',
      'Sin necesidad de intervención de Tierra; mantener rutina preventiva de hidratación, ejercicio y sueño.',
    ],
    symptomCohortBreakdown: {
      ...symptomBase,
      matchingHistoricalTier:
        'Estado basal nominal equivalente a las observaciones de control en CRF_C3_VITALS sin requerimiento de intervención en CRF_C3_SYMPTOMS.',
    },
  };
}
