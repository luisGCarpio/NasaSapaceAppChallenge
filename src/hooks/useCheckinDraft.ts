'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_CONTEXT,
  evaluateHealth,
  normalizeContext,
  type HealthEvaluation,
  type MoodValue,
  type PartialVitalValues,
  type VitalValues,
} from '@/domain/health';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import { ApiError, apiEvaluate, apiSaveCheckin } from '@/lib/client-api';
import type { PublicUserState } from '@/server/storage/types';

export interface CheckinDraftFields {
  sleep_hours: string;
  mood: MoodValue | '';
  heart_rate: string;
  bp_systolic: string;
  bp_diastolic: string;
  glucose: string;
  temperature: string;
}

const EMPTY_DRAFT: CheckinDraftFields = {
  sleep_hours: '',
  mood: '',
  heart_rate: '',
  bp_systolic: '',
  bp_diastolic: '',
  glucose: '',
  temperature: '',
};

function vitalsToDraft(vitals: VitalValues | PartialVitalValues | null): CheckinDraftFields {
  if (!vitals) return { ...EMPTY_DRAFT };
  return {
    sleep_hours: vitals.sleep_hours != null ? String(vitals.sleep_hours) : '',
    mood: vitals.mood ?? '',
    heart_rate: vitals.heart_rate != null ? String(vitals.heart_rate) : '',
    bp_systolic: vitals.bp_systolic != null ? String(vitals.bp_systolic) : '',
    bp_diastolic: vitals.bp_diastolic != null ? String(vitals.bp_diastolic) : '',
    glucose: vitals.glucose != null ? String(vitals.glucose) : '',
    temperature: vitals.temperature != null ? String(vitals.temperature) : '',
  };
}

export function useCheckinDraft(
  initialVitals: VitalValues | PartialVitalValues | null,
  initialContext: ObservationContext | null | undefined,
  onSaved: (nextState: PublicUserState) => void
) {
  const [draft, setDraft] = useState<CheckinDraftFields>(() => vitalsToDraft(initialVitals));
  const [context, setContext] = useState<ObservationContext>(() =>
    normalizeContext(initialContext)
  );
  const [previewEvaluation, setPreviewEvaluation] = useState<HealthEvaluation>(() =>
    evaluateHealth(initialVitals ?? {}, { context: initialContext ?? DEFAULT_CONTEXT })
  );
  const [saving, setSaving] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    setDraft(vitalsToDraft(initialVitals));
    setContext(normalizeContext(initialContext));
    setPreviewEvaluation(evaluateHealth(initialVitals ?? {}, { context: initialContext ?? DEFAULT_CONTEXT }));
  }, [initialVitals, initialContext]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const res = await apiEvaluate({ ...draft }, context);
        setPreviewEvaluation(res.evaluation);
      } catch (err) {
        if (err instanceof ApiError && err.data.evaluation) {
          setPreviewEvaluation(err.data.evaluation as HealthEvaluation);
        }
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [draft, context]);

  const setField = useCallback(<K extends keyof CheckinDraftFields>(key: K, value: CheckinDraftFields[K]) => {
    setSubmitFeedback(null);
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setContextField = useCallback(
    <K extends keyof ObservationContext>(key: K, value: ObservationContext[K]) => {
      setSubmitFeedback(null);
      setContext((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const loadBaseline = useCallback((vitals: VitalValues | PartialVitalValues) => {
    setSubmitFeedback(null);
    setDraft(vitalsToDraft(vitals));
  }, []);

  const clearDraft = useCallback(() => {
    setSubmitFeedback(null);
    setDraft({ ...EMPTY_DRAFT });
    setContext({ ...DEFAULT_CONTEXT });
  }, []);

  const submitCheckin = useCallback(async () => {
    setSaving(true);
    setSubmitFeedback(null);
    const submissionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    try {
      const res = await apiSaveCheckin({
        vitals: { ...draft },
        context,
        clientSubmissionId: submissionId,
      });
      setPreviewEvaluation(res.evaluation);
      onSaved(res.state);
      setSubmitFeedback({
        type: 'success',
        message: res.consolidated
          ? 'Observación guardada en bitácora y consolidada en el resumen del día.'
          : 'Nueva observación guardada correctamente con contexto y línea base personal.',
      });
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.data.evaluation) {
        setPreviewEvaluation(err.data.evaluation as HealthEvaluation);
      }
      setSubmitFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudo guardar el chequeo.',
      });
      return false;
    } finally {
      setSaving(false);
    }
  }, [draft, context, onSaved]);

  return {
    draft,
    context,
    previewEvaluation,
    saving,
    submitFeedback,
    setField,
    setContextField,
    loadBaseline,
    clearDraft,
    submitCheckin,
  };
}
