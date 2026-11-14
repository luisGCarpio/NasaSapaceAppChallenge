import { z } from 'zod';
import {
  VITAL_SPECS,
  type MoodValue,
  type NumericVitalKey,
  type PartialVitalValues,
  type VitalValues,
} from './vital-specs';

export const NUMERIC_FIELDS: readonly NumericVitalKey[] = [
  'sleep_hours',
  'heart_rate',
  'bp_systolic',
  'bp_diastolic',
  'glucose',
  'temperature',
];

const VALID_MOODS = new Set<string>(VITAL_SPECS.mood.allowed);

const strictVitalsObjectSchema = z.object({
  sleep_hours: z.number().min(VITAL_SPECS.sleep_hours.min).max(VITAL_SPECS.sleep_hours.max),
  heart_rate: z.number().min(VITAL_SPECS.heart_rate.min).max(VITAL_SPECS.heart_rate.max),
  bp_systolic: z.number().min(VITAL_SPECS.bp_systolic.min).max(VITAL_SPECS.bp_systolic.max),
  bp_diastolic: z.number().min(VITAL_SPECS.bp_diastolic.min).max(VITAL_SPECS.bp_diastolic.max),
  glucose: z.number().min(VITAL_SPECS.glucose.min).max(VITAL_SPECS.glucose.max),
  temperature: z.number().min(VITAL_SPECS.temperature.min).max(VITAL_SPECS.temperature.max),
  mood: z.enum(VITAL_SPECS.mood.allowed as [MoodValue, ...MoodValue[]]),
});

export interface VitalValidationResult {
  valid: boolean;
  vitals: VitalValues | PartialVitalValues;
  fieldErrors: Record<string, string>;
  errors: string[];
}

function parseStrictNumericField(value: unknown): { present: boolean; valid: boolean; num: number | null } {
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'object') {
    return { present: value !== null && value !== undefined, valid: false, num: null };
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? { present: true, valid: true, num: value }
      : { present: true, valid: false, num: null };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(',', '.');
    if (trimmed === '') return { present: false, valid: false, num: null };
    if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(trimmed)) return { present: true, valid: false, num: null };
    const num = Number(trimmed);
    return Number.isFinite(num)
      ? { present: true, valid: true, num }
      : { present: true, valid: false, num: null };
  }
  return { present: true, valid: false, num: null };
}

/**
 * Valida explícitamente los 7 campos de signos vitales sin sustituir valores ausentes o inválidos.
 */
export function validateVitals(rawVitals: unknown): VitalValidationResult {
  const fieldErrors: Record<string, string> = {};
  const vitals: PartialVitalValues = {
    sleep_hours: null,
    mood: null,
    heart_rate: null,
    bp_systolic: null,
    bp_diastolic: null,
    glucose: null,
    temperature: null,
  };

  if (!rawVitals || typeof rawVitals !== 'object' || Array.isArray(rawVitals)) {
    for (const field of NUMERIC_FIELDS) {
      const spec = VITAL_SPECS[field];
      fieldErrors[field] = `${spec.label} es obligatorio (${spec.min}-${spec.max} ${spec.unit}).`;
    }
    fieldErrors.mood = 'Estado de ánimo es obligatorio.';
    return { valid: false, vitals, fieldErrors, errors: Object.values(fieldErrors) };
  }

  const record = rawVitals as Record<string, unknown>;
  for (const field of NUMERIC_FIELDS) {
    const spec = VITAL_SPECS[field];
    const parsed = parseStrictNumericField(record[field]);
    if (!parsed.present) {
      fieldErrors[field] = `${spec.label} es obligatorio.`;
      continue;
    }
    if (!parsed.valid || parsed.num === null) {
      fieldErrors[field] = `${spec.label} debe ser un número válido.`;
      continue;
    }
    if (parsed.num < spec.min || parsed.num > spec.max) {
      fieldErrors[field] = `${spec.label} (${parsed.num} ${spec.unit}) está fuera del rango permitido (${spec.min}-${spec.max} ${spec.unit}).`;
      vitals[field] = parsed.num;
      continue;
    }
    vitals[field] =
      field === 'sleep_hours' || field === 'temperature'
        ? Math.round(parsed.num * 10) / 10
        : Math.round(parsed.num);
  }

  const moodRaw = typeof record.mood === 'string' ? record.mood.trim().toLowerCase() : '';
  if (!moodRaw) {
    fieldErrors.mood = 'Estado de ánimo es obligatorio.';
  } else if (!VALID_MOODS.has(moodRaw)) {
    fieldErrors.mood = `Estado de ánimo '${String(record.mood)}' no es válido.`;
  } else {
    vitals.mood = moodRaw as MoodValue;
  }

  if (
    !fieldErrors.bp_systolic &&
    !fieldErrors.bp_diastolic &&
    vitals.bp_systolic !== null &&
    vitals.bp_diastolic !== null
  ) {
    if (vitals.bp_diastolic >= vitals.bp_systolic || vitals.bp_systolic - vitals.bp_diastolic < 10) {
      fieldErrors.bp_diastolic =
        'La presión diastólica (baja) debe ser al menos 10 mmHg menor que la presión sistólica (alta).';
    }
  }

  const parsedSchema = strictVitalsObjectSchema.safeParse(vitals);
  if (Object.keys(fieldErrors).length === 0 && parsedSchema.success) {
    return { valid: true, vitals: parsedSchema.data, fieldErrors: {}, errors: [] };
  }

  return { valid: false, vitals, fieldErrors, errors: Object.values(fieldErrors) };
}
