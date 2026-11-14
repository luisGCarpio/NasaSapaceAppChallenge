export const ALGORITHM_VERSION = '2.0.0' as const;

export const STATUS = {
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  RED: 'RED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
} as const;

export type HealthStatus = (typeof STATUS)[keyof typeof STATUS];

export const STATUS_LABELS: Record<HealthStatus, string> = {
  GREEN: 'Óptimo',
  YELLOW: 'Cuidado',
  RED: 'Peligro',
  INSUFFICIENT_DATA: 'Datos Insuficientes',
};

export const STATUS_RANK: Record<HealthStatus, number> = {
  GREEN: 0,
  YELLOW: 1,
  RED: 2,
  INSUFFICIENT_DATA: 3,
};

export type MoodValue = 'excelente' | 'bien' | 'cansado' | 'estresado' | 'agotado';

export type NumericVitalKey =
  | 'sleep_hours'
  | 'heart_rate'
  | 'bp_systolic'
  | 'bp_diastolic'
  | 'glucose'
  | 'temperature';

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
  sleep_hours: number | null;
  mood: MoodValue | null;
  heart_rate: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  glucose: number | null;
  temperature: number | null;
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
  sleep_hours: { min: 0, max: 14, step: 0.5, unit: 'h', optimalText: '7.0 - 9.0 h', label: 'Horas de sueño' },
  heart_rate: { min: 40, max: 180, step: 1, unit: 'BPM', optimalText: '60 - 85 BPM', label: 'Frecuencia cardíaca' },
  bp_systolic: { min: 70, max: 200, step: 1, unit: 'mmHg', optimalText: '100 - 125 mmHg', label: 'Presión sistólica (alta)' },
  bp_diastolic: { min: 40, max: 130, step: 1, unit: 'mmHg', optimalText: '65 - 80 mmHg', label: 'Presión diastólica (baja)' },
  glucose: { min: 50, max: 250, step: 1, unit: 'mg/dL', optimalText: '70 - 99 mg/dL', label: 'Glucosa en sangre' },
  temperature: { min: 34.5, max: 41.0, step: 0.1, unit: '°C', optimalText: '36.1 - 37.2 °C', label: 'Temperatura corporal' },
  mood: { allowed: ['excelente', 'bien', 'cansado', 'estresado', 'agotado'], label: 'Estado de ánimo' },
};

export interface ActionRecommendation {
  actionIcon: ActionIconKey;
  actionText: string;
}

export const ACTIONS = {
  HYDRATE: { actionIcon: 'droplet', actionText: 'Hidratarse (Beber agua)' },
  EXERCISE: { actionIcon: 'activity', actionText: 'Ejercicio / Estiramiento (30 min)' },
  SLEEP: { actionIcon: 'moon', actionText: 'Descanso / Dormir' },
  BREATHE: { actionIcon: 'wind', actionText: 'Respiración / Pausa mental (5 min)' },
  COMMS: { actionIcon: 'radio', actionText: 'Avisar al equipo / Tierra en 1 clic' },
  REVIEW_INPUT: { actionIcon: 'sliders', actionText: 'Completar o corregir los datos ingresados' },
} as const satisfies Record<string, ActionRecommendation>;

export interface ScientificReference {
  source: string;
  url: string;
}

export const REFERENCES: Record<'MIND' | 'HEART' | 'BODY' | 'CSA', ScientificReference> = {
  MIND: { source: 'NASA HRP — Hazards of Human Spaceflight (Isolation, Sleep & Stress)', url: 'https://www.nasa.gov/hrp/hazards/' },
  HEART: { source: 'NASA HRP — Human Health & Cardiovascular Risks in Space', url: 'https://www.nasa.gov/hrp/risks/' },
  BODY: { source: 'NASA HRP — Ongoing Metabolic, Thermoregulation & Immune Research', url: 'https://www.nasa.gov/hrp/ongoing-hrp-research/' },
  CSA: { source: 'CSA — Astronaut Health & Spaceflight Science', url: 'https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp' },
};

export interface ConclusionCard {
  id?: string;
  status: HealthStatus;
  label: string;
  title: string;
  message: string;
  actionIcon: ActionIconKey;
  actionText: string;
  reasons: string[];
  reference: ScientificReference;
  commsMessage?: string;
}

export interface SystemEvaluation extends ConclusionCard {
  systemId: SystemId;
  systemName: string;
  systemIcon: 'brain' | 'heart' | 'shield';
}

export interface ScorePenalty {
  factor: string;
  detail: string;
  penalty: number;
}

export interface HealthEvaluation {
  valid: boolean;
  algorithmVersion: string;
  overallStatus: HealthStatus;
  overallLabel: string;
  readinessScore: number | null;
  scoreBreakdown: ScorePenalty[];
  fieldErrors: Record<string, string>;
  errors: string[];
  systems: Record<SystemId, SystemEvaluation>;
  crossConclusion: ConclusionCard;
  crossConclusionId: string | null;
  triggeredCrosses: ConclusionCard[];
  commsMessage: string;
  vitals: VitalValues | PartialVitalValues;
}
