import type { ObservationContext } from '../nasa/nasa-types';
import type { BaselineMap } from './baseline-analyzer';
import type {
  CoverageSummary,
  MoodValue,
  NumericVitalKey,
  QualityAssessment,
  SystemCoverage,
} from './context-specs';
import { VERIFIED_SOURCES, type RuleAuditTrace } from './rules-catalog';

export const ALGORITHM_VERSION = '3.0.0' as const;

export const STATUS = {
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  RED: 'RED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
} as const;

export type HealthStatus = (typeof STATUS)[keyof typeof STATUS];
export type { MoodValue, NumericVitalKey };

export const STATUS_LABELS: Record<HealthStatus, string> = {
  GREEN: 'Óptimo / Operativo',
  YELLOW: 'Precaución / Seguimiento',
  RED: 'Prioridad Alta / Revisión',
  INSUFFICIENT_DATA: 'Datos Insuficientes',
};

export const STATUS_RANK: Record<HealthStatus, number> = {
  INSUFFICIENT_DATA: 0,
  GREEN: 1,
  YELLOW: 2,
  RED: 3,
};

export type SystemId = 'mind' | 'heart' | 'body';
export type ActionIconKey = 'droplet' | 'activity' | 'moon' | 'wind' | 'radio' | 'sliders' | 'shield';

export interface VitalValues {
  sleep_hours: number;
  mood: MoodValue;
  heart_rate: number;
  bp_systolic: number;
  bp_diastolic: number;
  glucose: number;
  temperature: number;
}

export interface PartialVitalValues {
  sleep_hours?: number | null;
  mood?: MoodValue | null;
  heart_rate?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  glucose?: number | null;
  temperature?: number | null;
}

export interface VitalNumericSpec {
  min: number;
  max: number;
  step: number;
  unit: string;
  optimalText: string;
  label: string;
}

export const VITAL_SPECS: Record<NumericVitalKey, VitalNumericSpec> & {
  mood: { allowed: readonly MoodValue[]; label: string };
} = {
  sleep_hours: { min: 0, max: 16, step: 0.5, unit: 'h', optimalText: '7.0 - 9.0 h', label: 'Horas de sueño' },
  heart_rate: { min: 30, max: 220, step: 1, unit: 'lpm', optimalText: '60 - 100 lpm', label: 'Frecuencia cardíaca' },
  bp_systolic: { min: 55, max: 250, step: 1, unit: 'mmHg', optimalText: '90 - 120 mmHg', label: 'Presión sistólica (alta)' },
  bp_diastolic: { min: 30, max: 150, step: 1, unit: 'mmHg', optimalText: '60 - 80 mmHg', label: 'Presión diastólica (baja)' },
  glucose: { min: 20, max: 600, step: 1, unit: 'mg/dL', optimalText: '70 - 99 mg/dL (ayunas)', label: 'Glucosa en sangre' },
  temperature: { min: 34.0, max: 42.5, step: 0.1, unit: '°C', optimalText: '36.1 - 37.2 °C', label: 'Temperatura corporal' },
  mood: { allowed: ['excelente', 'bien', 'cansado', 'estresado', 'agotado'], label: 'Estado de ánimo' },
};

export interface ActionRecommendation {
  actionIcon: ActionIconKey;
  actionText: string;
}

export const ACTIONS = {
  HYDRATE: { actionIcon: 'droplet', actionText: 'Hidratar vía oral y reevaluar FC/PA en 10-15 min en reposo' },
  EXERCISE: { actionIcon: 'activity', actionText: 'Actividad / estiramiento ligero (solo si no hay restricción)' },
  SLEEP: { actionIcon: 'moon', actionText: 'Priorizar descanso / sueño y pausar carga cognitiva' },
  BREATHE: { actionIcon: 'wind', actionText: 'Reposo sentado 5 min, respiración guiada y confirmar medición' },
  COMMS: { actionIcon: 'radio', actionText: 'Registrar en bitácora médica y escalar según prioridad' },
  REVIEW_INPUT: { actionIcon: 'sliders', actionText: 'Completar contexto (ayuno/postura) o repetir toma' },
  ISOLATE: { actionIcon: 'shield', actionText: 'Reposo preventivo, monitoreo cada 2 h y suspender esfuerzo físico' },
} as const satisfies Record<string, ActionRecommendation>;

export interface ScientificReference {
  id: string;
  source: string;
  detail: string;
  url: string;
  tier: string;
}

export const REFERENCES: Record<'MIND' | 'HEART' | 'BODY' | 'CSA' | 'GLUCOSE' | 'FEVER', ScientificReference> = {
  MIND: {
    id: VERIFIED_SOURCES.nasa_sleep.id,
    source: `${VERIFIED_SOURCES.nasa_sleep.organization} — ${VERIFIED_SOURCES.nasa_sleep.title}`,
    detail: VERIFIED_SOURCES.nasa_sleep.sectionNote,
    url: VERIFIED_SOURCES.nasa_sleep.url,
    tier: VERIFIED_SOURCES.nasa_sleep.tier,
  },
  HEART: {
    id: VERIFIED_SOURCES.aha_bp.id,
    source: `${VERIFIED_SOURCES.aha_bp.organization} — ${VERIFIED_SOURCES.aha_bp.title}`,
    detail: VERIFIED_SOURCES.aha_bp.sectionNote,
    url: VERIFIED_SOURCES.aha_bp.url,
    tier: VERIFIED_SOURCES.aha_bp.tier,
  },
  BODY: {
    id: VERIFIED_SOURCES.nasa_orthostatic.id,
    source: `${VERIFIED_SOURCES.nasa_orthostatic.organization} — ${VERIFIED_SOURCES.nasa_orthostatic.title}`,
    detail: VERIFIED_SOURCES.nasa_orthostatic.sectionNote,
    url: VERIFIED_SOURCES.nasa_orthostatic.url,
    tier: VERIFIED_SOURCES.nasa_orthostatic.tier,
  },
  CSA: {
    id: VERIFIED_SOURCES.csa_health.id,
    source: `${VERIFIED_SOURCES.csa_health.organization} — ${VERIFIED_SOURCES.csa_health.title}`,
    detail: VERIFIED_SOURCES.csa_health.sectionNote,
    url: VERIFIED_SOURCES.csa_health.url,
    tier: VERIFIED_SOURCES.csa_health.tier,
  },
  GLUCOSE: {
    id: VERIFIED_SOURCES.niddk_glucose.id,
    source: `${VERIFIED_SOURCES.niddk_glucose.organization} — ${VERIFIED_SOURCES.niddk_glucose.title}`,
    detail: VERIFIED_SOURCES.niddk_glucose.sectionNote,
    url: VERIFIED_SOURCES.niddk_glucose.url,
    tier: VERIFIED_SOURCES.niddk_glucose.tier,
  },
  FEVER: {
    id: VERIFIED_SOURCES.medline_fever.id,
    source: `${VERIFIED_SOURCES.medline_fever.organization} — ${VERIFIED_SOURCES.medline_fever.title}`,
    detail: VERIFIED_SOURCES.medline_fever.sectionNote,
    url: VERIFIED_SOURCES.medline_fever.url,
    tier: VERIFIED_SOURCES.medline_fever.tier,
  },
};

export interface ConclusionCard {
  id?: string | null;
  status: HealthStatus;
  label: string;
  title: string;
  message: string;
  actionIcon: ActionIconKey;
  actionText: string;
  reasons: string[];
  reference: ScientificReference;
  commsMessage?: string;
  ruleTrace?: RuleAuditTrace;
}

export interface SystemEvaluation extends ConclusionCard {
  systemId: SystemId;
  systemName: string;
  systemIcon: 'brain' | 'heart' | 'shield';
  coverage?: SystemCoverage;
  metricsSummary?: string;
}

export interface ScorePenalty {
  factor: string;
  detail: string;
  penalty: number;
}

export interface ClinicalRestrictions {
  restrictStrenuousExercise: boolean;
  reasons: string[];
}

export interface HealthEvaluation {
  valid: boolean;
  algorithmVersion: string;
  overallStatus: HealthStatus;
  overallLabel: string;
  readinessScore: number | null;
  scoreConfidence: 'high' | 'partial' | 'insufficient';
  scoreBreakdown: ScorePenalty[];
  fieldErrors: Record<string, string>;
  errors: string[];
  systems: Record<SystemId, SystemEvaluation>;
  crossConclusion: ConclusionCard;
  crossConclusionId: string | null;
  triggeredCrosses: ConclusionCard[];
  commsMessage: string;
  vitals: PartialVitalValues;
  context: ObservationContext;
  coverage: CoverageSummary;
  quality: QualityAssessment;
  baselines: BaselineMap;
  ruleTraces: RuleAuditTrace[];
  clinicalRestrictions: ClinicalRestrictions;
  missingSystems: SystemId[];
}
