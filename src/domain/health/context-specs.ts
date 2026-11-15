import type {
  ActivityState,
  GlucoseTiming,
  ObservationContext,
  PostureState,
  TempMethod,
} from '../nasa/nasa-types';

export type MoodValue = 'excelente' | 'bien' | 'cansado' | 'estresado' | 'agotado';

export type NumericVitalKey =
  | 'sleep_hours'
  | 'heart_rate'
  | 'bp_systolic'
  | 'bp_diastolic'
  | 'glucose'
  | 'temperature';

export type VitalKey = NumericVitalKey | 'mood';
export type SystemKey = 'mind' | 'heart' | 'body';

export type QualityTier =
  | 'verified'
  | 'provisional'
  | 'incomplete'
  | 'contextual_pending';

export interface SystemCoverage {
  present: VitalKey[];
  missing: VitalKey[];
  partial: boolean;
}

export interface CoverageSummary {
  presentIndicators: VitalKey[];
  missingIndicators: VitalKey[];
  presentCount: number;
  totalCount: number;
  coveragePct: number;
  systemCoverage: Record<SystemKey, SystemCoverage>;
}

export interface QualityAssessment {
  tier: QualityTier;
  label: string;
  reasons: string[];
  contextComplete: boolean;
  confirmedRepeated: boolean;
  needsRecheck: boolean;
  recheckWindow: string | null;
}

export interface PriorObservationInput {
  observationId?: string;
  capturedAt?: string;
  sortOrder?: number;
  overallStatus?: string;
  vitals: Partial<Record<NumericVitalKey, number | null>> & { mood?: MoodValue | null };
  context?: Partial<ObservationContext>;
}

export interface EvaluateHealthOptions {
  context?: Partial<ObservationContext>;
  priorObservations?: PriorObservationInput[];
  previousStatus?: string | null;
  referenceTimestamp?: string;
}

export const DEFAULT_CONTEXT: ObservationContext = {
  activityState: 'rest',
  posture: 'seated',
  glucoseTiming: 'unknown',
  tempMethod: 'oral',
  confirmedRepeated: false,
  symptoms: [],
};

const VALID_ACTIVITY_STATES = new Set<ActivityState>(['rest', 'post_exercise', 'eva', 'orthostatic_tilt']);
const VALID_POSTURE_STATES = new Set<PostureState>(['supine', 'seated', 'standing_tilt', 'unknown']);
const VALID_GLUCOSE_TIMINGS = new Set<GlucoseTiming>(['fasting', 'post_meal', 'random', 'unknown']);
const VALID_TEMP_METHODS = new Set<TempMethod>(['oral', 'tympanic', 'core_sensor', 'unknown']);

function pickValidEnum<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === 'string' && allowed.has(value as T) ? (value as T) : fallback;
}

export function normalizeContext(raw?: Partial<ObservationContext> | null): ObservationContext {
  const symptoms = Array.isArray(raw?.symptoms)
    ? raw.symptoms.map((s) => String(s).trim()).filter(Boolean).slice(0, 10)
    : [];
  return {
    activityState: pickValidEnum(raw?.activityState, VALID_ACTIVITY_STATES, DEFAULT_CONTEXT.activityState),
    posture: pickValidEnum(raw?.posture, VALID_POSTURE_STATES, DEFAULT_CONTEXT.posture),
    glucoseTiming: pickValidEnum(raw?.glucoseTiming, VALID_GLUCOSE_TIMINGS, DEFAULT_CONTEXT.glucoseTiming),
    tempMethod: pickValidEnum(raw?.tempMethod, VALID_TEMP_METHODS, DEFAULT_CONTEXT.tempMethod),
    confirmedRepeated: Boolean(raw?.confirmedRepeated),
    symptoms,
    studyNote: raw?.studyNote ? String(raw.studyNote).trim() : undefined,
  };
}

export const ACTIVITY_OPTIONS: { value: ActivityState; label: string }[] = [
  { value: 'rest', label: 'Reposo (>=5 min tranquilo)' },
  { value: 'post_exercise', label: 'Post-ejercicio (<30 min)' },
  { value: 'eva', label: 'Actividad EVA / carga alta' },
  { value: 'orthostatic_tilt', label: 'Prueba ortostática / Tilt' },
];

export const POSTURE_OPTIONS: { value: PostureState; label: string }[] = [
  { value: 'seated', label: 'Sentado' },
  { value: 'supine', label: 'Supino / acostado (HDT)' },
  { value: 'standing_tilt', label: 'De pie / Tilt vertical' },
  { value: 'unknown', label: 'Postura no especificada' },
];

export const GLUCOSE_TIMING_OPTIONS: { value: GlucoseTiming; label: string }[] = [
  { value: 'fasting', label: 'En ayunas (>=8 h)' },
  { value: 'post_meal', label: 'Postprandial (1-2 h tras comer)' },
  { value: 'random', label: 'Aleatoria (sin ayuno)' },
  { value: 'unknown', label: 'Momento no especificado' },
];

export const TEMP_METHOD_OPTIONS: { value: TempMethod; label: string }[] = [
  { value: 'oral', label: 'Oral' },
  { value: 'tympanic', label: 'Timpánica' },
  { value: 'core_sensor', label: 'Sensor central' },
  { value: 'unknown', label: 'Método no especificado' },
];

export const COMMON_SYMPTOMS: string[] = [
  'Mareo ortostático',
  'Fatiga severa',
  'Cefalea',
  'Palpitaciones',
  'Fiebre / escalofríos',
  'Náusea',
];
