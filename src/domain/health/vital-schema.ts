import { z } from 'zod';
import {
  CoverageSummary,
  NumericVitalKey,
  SystemCoverage,
  SystemKey,
  VitalKey,
} from './context-specs';
import { PartialVitalValues, VITAL_SPECS } from './vital-specs';

export interface VitalsValidationResult {
  valid: boolean;
  vitals: PartialVitalValues;
  fieldErrors: Record<string, string>;
  errors: string[];
  coverage: CoverageSummary;
}

const NUMERIC_KEYS: NumericVitalKey[] = [
  'sleep_hours',
  'heart_rate',
  'bp_systolic',
  'bp_diastolic',
  'glucose',
  'temperature',
];

const ALL_KEYS: VitalKey[] = ['mood', ...NUMERIC_KEYS];

const SYSTEM_KEY_MAP: Record<SystemKey, VitalKey[]> = {
  mind: ['mood', 'sleep_hours'],
  heart: ['heart_rate', 'bp_systolic', 'bp_diastolic'],
  body: ['temperature', 'glucose'],
};

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function computeCoverage(vitals: PartialVitalValues): CoverageSummary {
  const presentIndicators: VitalKey[] = [];
  const missingIndicators: VitalKey[] = [];

  for (const key of ALL_KEYS) {
    if (key === 'mood') {
      if (vitals.mood && VITAL_SPECS.mood.allowed.includes(vitals.mood)) {
        presentIndicators.push('mood');
      } else {
        missingIndicators.push('mood');
      }
    } else if (isFiniteNum(vitals[key])) {
      presentIndicators.push(key);
    } else {
      missingIndicators.push(key);
    }
  }

  const systemCoverage = {} as Record<SystemKey, SystemCoverage>;
  (['mind', 'heart', 'body'] as SystemKey[]).forEach((sys) => {
    const keys = SYSTEM_KEY_MAP[sys];
    const present = keys.filter((k) => presentIndicators.includes(k));
    const missing = keys.filter((k) => !presentIndicators.includes(k));
    systemCoverage[sys] = { present, missing, partial: present.length > 0 && missing.length > 0 };
  });

  const presentCount = presentIndicators.length;
  const totalCount = ALL_KEYS.length;
  return {
    presentIndicators,
    missingIndicators,
    presentCount,
    totalCount,
    coveragePct: Math.round((presentCount / totalCount) * 100),
    systemCoverage,
  };
}

export function validateVitals(
  rawVitals: unknown,
  options: { requireAll?: boolean } = {}
): VitalsValidationResult {
  const fieldErrors: Record<string, string> = {};
  const errors: string[] = [];
  const vitals: PartialVitalValues = {};

  if (!rawVitals || typeof rawVitals !== 'object' || Array.isArray(rawVitals)) {
    const msg = 'No se proporcionaron indicadores fisiológicos válidos.';
    return { valid: false, vitals, fieldErrors: {}, errors: [msg], coverage: computeCoverage(vitals) };
  }

  const input = rawVitals as Record<string, unknown>;

  // Mood validation (optional unless requireAll)
  const rawMood = input.mood;
  if (rawMood !== undefined && rawMood !== null && String(rawMood).trim() !== '') {
    const m = String(rawMood).trim() as (typeof VITAL_SPECS.mood.allowed)[number];
    if (!VITAL_SPECS.mood.allowed.includes(m)) {
      const msg = `${VITAL_SPECS.mood.label}: opción inválida.`;
      fieldErrors.mood = msg;
      errors.push(msg);
    } else {
      vitals.mood = m;
    }
  } else if (options.requireAll) {
    const msg = `${VITAL_SPECS.mood.label}: selecciona una opción.`;
    fieldErrors.mood = msg;
    errors.push(msg);
  }

  // Numeric vitals validation
  for (const key of NUMERIC_KEYS) {
    const spec = VITAL_SPECS[key];
    const rawVal = input[key];
    const isEmpty =
      rawVal === undefined ||
      rawVal === null ||
      (typeof rawVal === 'string' && rawVal.trim() === '');

    if (isEmpty) {
      if (options.requireAll) {
        const msg = `${spec.label}: campo requerido (${spec.min}–${spec.max} ${spec.unit}).`;
        fieldErrors[key] = msg;
        errors.push(msg);
      }
      continue;
    }

    const num = typeof rawVal === 'number' ? rawVal : Number(String(rawVal).trim());
    const schema = z
      .number({ message: `${spec.label}: debe ser un número válido.` })
      .finite(`${spec.label}: valor numérico inválido.`)
      .min(spec.min, `${spec.label}: mínimo permitido ${spec.min} ${spec.unit}.`)
      .max(spec.max, `${spec.label}: máximo permitido ${spec.max} ${spec.unit}.`);

    const parsed = schema.safeParse(num);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? `${spec.label}: valor inválido.`;
      fieldErrors[key] = msg;
      errors.push(msg);
      continue;
    }
    vitals[key] = parsed.data;
  }

  const hasSys = isFiniteNum(vitals.bp_systolic);
  const hasDia = isFiniteNum(vitals.bp_diastolic);

  if (hasSys && !hasDia && !fieldErrors.bp_diastolic) {
    const msg = 'Si ingresas presión sistólica debes incluir la diastólica.';
    fieldErrors.bp_diastolic = msg;
    errors.push(msg);
  } else if (!hasSys && hasDia && !fieldErrors.bp_systolic) {
    const msg = 'Si ingresas presión diastólica debes incluir la sistólica.';
    fieldErrors.bp_systolic = msg;
    errors.push(msg);
  } else if (hasSys && hasDia && vitals.bp_diastolic! > vitals.bp_systolic! - 10) {
    const msg = 'La presión diastólica debe ser al menos 10 mmHg menor que la sistólica.';
    fieldErrors.bp_diastolic = msg;
    errors.push(msg);
  }

  const coverage = computeCoverage(vitals);
  if (coverage.presentCount === 0 && errors.length === 0) {
    errors.push('Ingresa al menos un indicador clínico válido para evaluar.');
  }

  return {
    valid: errors.length === 0 && coverage.presentCount > 0,
    vitals,
    fieldErrors,
    errors,
    coverage,
  };
}
