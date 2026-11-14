import {
  STATUS,
  type HealthStatus,
  type MoodValue,
  type PartialVitalValues,
  type SystemId,
} from '@/domain/health';

export type TabKey = 'astro' | 'controls' | 'monitor' | 'missions' | 'nasa';
export type VitalToggleKey = 'sleep_hours' | 'mood' | 'heart_rate' | 'bp' | 'glucose' | 'temperature';

export interface StudioDraft {
  sleep_hours: number;
  moodIndex: number;
  heart_rate: number;
  bp_systolic: number;
  bp_diastolic: number;
  glucose: number;
  temperature: number;
  measured: Record<VitalToggleKey, boolean>;
}

export const MOOD_DISPLAY = ['Límite', 'Tenso', 'Cansado', 'Bien', 'Genial'] as const;
export const MOOD_LABELS_FULL = ['Al límite', 'Estresado', 'Cansado', 'Bien', 'Excelente'] as const;
export const MOOD_INDEX_TO_DOMAIN: Record<number, MoodValue> = {
  0: 'agotado',
  1: 'estresado',
  2: 'cansado',
  3: 'bien',
  4: 'excelente',
};
export const DOMAIN_MOOD_TO_INDEX: Record<MoodValue, number> = {
  agotado: 0,
  estresado: 1,
  cansado: 2,
  bien: 3,
  excelente: 4,
};

export function createCleanDraft(): StudioDraft {
  return {
    sleep_hours: 8.0,
    moodIndex: 4,
    heart_rate: 72,
    bp_systolic: 115,
    bp_diastolic: 75,
    glucose: 88,
    temperature: 36.6,
    measured: {
      sleep_hours: false,
      mood: false,
      heart_rate: false,
      bp: false,
      glucose: false,
      temperature: false,
    },
  };
}

export function draftFromVitals(vitals: PartialVitalValues | null): StudioDraft {
  if (!vitals) return createCleanDraft();
  const hasSleep = typeof vitals.sleep_hours === 'number';
  const hasMood = Boolean(vitals.mood);
  const hasHr = typeof vitals.heart_rate === 'number';
  const hasBp = typeof vitals.bp_systolic === 'number' && typeof vitals.bp_diastolic === 'number';
  const hasGluc = typeof vitals.glucose === 'number';
  const hasTemp = typeof vitals.temperature === 'number';

  return {
    sleep_hours: hasSleep ? (vitals.sleep_hours as number) : 8.0,
    moodIndex: hasMood && vitals.mood ? DOMAIN_MOOD_TO_INDEX[vitals.mood] : 4,
    heart_rate: hasHr ? (vitals.heart_rate as number) : 72,
    bp_systolic: typeof vitals.bp_systolic === 'number' ? vitals.bp_systolic : 115,
    bp_diastolic: typeof vitals.bp_diastolic === 'number' ? vitals.bp_diastolic : 75,
    glucose: hasGluc ? (vitals.glucose as number) : 88,
    temperature: hasTemp ? (vitals.temperature as number) : 36.6,
    measured: {
      sleep_hours: hasSleep,
      mood: hasMood,
      heart_rate: hasHr,
      bp: hasBp,
      glucose: hasGluc,
      temperature: hasTemp,
    },
  };
}

export function draftToPartialVitals(draft: StudioDraft): PartialVitalValues {
  const out: PartialVitalValues = {};
  if (draft.measured.sleep_hours) out.sleep_hours = draft.sleep_hours;
  if (draft.measured.mood) out.mood = MOOD_INDEX_TO_DOMAIN[draft.moodIndex] ?? 'bien';
  if (draft.measured.heart_rate) out.heart_rate = draft.heart_rate;
  if (draft.measured.bp) {
    out.bp_systolic = draft.bp_systolic;
    out.bp_diastolic = draft.bp_diastolic;
  }
  if (draft.measured.glucose) out.glucose = draft.glucose;
  if (draft.measured.temperature) out.temperature = draft.temperature;
  return out;
}

export function statusToLevel(status: HealthStatus): -1 | 0 | 1 | 2 {
  if (status === STATUS.GREEN) return 0;
  if (status === STATUS.YELLOW) return 1;
  if (status === STATUS.RED) return 2;
  return -1;
}

export function colorForLevel(lvl: -1 | 0 | 1 | 2): string {
  if (lvl === 0) return 'var(--green)';
  if (lvl === 1) return 'var(--yellow)';
  if (lvl === 2) return 'var(--red)';
  return '#CBD5E1';
}

export function bgForLevel(lvl: -1 | 0 | 1 | 2): string {
  if (lvl === 0) return 'var(--green-bg)';
  if (lvl === 1) return 'var(--yellow-bg)';
  if (lvl === 2) return 'var(--red-bg)';
  return 'var(--surface-alt)';
}

export function systemPercent(status: HealthStatus, score: number | null): number | null {
  if (status === STATUS.INSUFFICIENT_DATA) return null;
  if (status === STATUS.GREEN) return score !== null ? Math.max(85, Math.min(100, score)) : 92;
  if (status === STATUS.YELLOW) return score !== null ? Math.max(52, Math.min(78, score)) : 65;
  return score !== null ? Math.max(18, Math.min(45, score)) : 32;
}

export const SYSTEM_TO_TARGET: Record<SystemId, string> = {
  mind: 'group-mind',
  heart: 'group-heart',
  body: 'group-body',
};
