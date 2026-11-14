import type { HealthEvaluation, PartialVitalValues } from '@/domain/health';
import type { PriorObservationInput } from '@/domain/health/context-specs';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import { apiLogComms, apiSaveCheckin } from '@/lib/client-api';
import type { HealthObservation, PublicUserState } from '@/server/storage/types';
import type { StudioDraft, VitalToggleKey } from './studio-types';

export type NumericVitalField =
  | 'sleep_hours'
  | 'heart_rate'
  | 'bp_systolic'
  | 'bp_diastolic'
  | 'glucose'
  | 'temperature';

export function mapObservationsToPrior(observations: HealthObservation[]): PriorObservationInput[] {
  return observations.map((o) => ({
    observationId: o.observationId,
    capturedAt: o.capturedAt,
    overallStatus: o.overallStatus,
    vitals: o.vitals,
    context: o.context,
  }));
}

export function applyNumericToDraft(prev: StudioDraft, field: NumericVitalField, value: number): StudioDraft {
  const toggleKey: VitalToggleKey = field === 'bp_systolic' || field === 'bp_diastolic' ? 'bp' : field;
  return { ...prev, [field]: value, measured: { ...prev.measured, [toggleKey]: true } };
}

export function applyMoodToDraft(prev: StudioDraft, moodIndex: number): StudioDraft {
  return { ...prev, moodIndex, measured: { ...prev.measured, mood: true } };
}

export function toggleDraftMeasure(prev: StudioDraft, key: VitalToggleKey): StudioDraft {
  return { ...prev, measured: { ...prev.measured, [key]: !prev.measured[key] } };
}

export function bpmToCssDuration(bpm?: number | null): string {
  const safe = typeof bpm === 'number' ? bpm : 72;
  return `${(60 / Math.max(35, Math.min(185, safe))).toFixed(2)}s`;
}

export async function submitStudioCheckin(args: {
  userState: PublicUserState | null;
  evaluation: HealthEvaluation;
  partialVitals: PartialVitalValues;
  context: ObservationContext;
  applyUpdatedState: (next: PublicUserState) => void;
}): Promise<{ ok: boolean; text: string }> {
  if (!args.userState || args.evaluation.coverage.presentCount === 0) {
    return { ok: false, text: 'Inicia sesión y mide al menos 1 indicador para guardar.' };
  }
  const clientSubmissionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const res = await apiSaveCheckin({
    vitals: args.partialVitals as Record<string, unknown>,
    context: args.context,
    clientSubmissionId,
  });
  args.applyUpdatedState(res.state);
  return {
    ok: true,
    text: `✓ Toma real guardada (${args.evaluation.coverage.presentCount}/7 · ${args.evaluation.overallStatus})`,
  };
}

export async function dispatchEarthComms(args: {
  userState: PublicUserState | null;
  evaluation: HealthEvaluation;
  applyUpdatedState: (next: PublicUserState) => void;
}): Promise<{ copied: boolean; sentAt: string }> {
  let copied = false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(args.evaluation.commsMessage);
      copied = true;
    }
  } catch {
    copied = false;
  }

  if (args.userState) {
    const res = await apiLogComms({
      message: args.evaluation.commsMessage,
      overallStatus: args.evaluation.overallStatus,
      readinessScore: args.evaluation.readinessScore,
      copiedToClipboard: copied,
    });
    args.applyUpdatedState(res.state);
  }
  return { copied, sentAt: new Date().toISOString() };
}
