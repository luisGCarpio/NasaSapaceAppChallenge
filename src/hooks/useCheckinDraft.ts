'use client';

import { useCallback, useEffect, useState } from 'react';
import { evaluateHealth, type HealthEvaluation, type MoodValue, type VitalValues } from '@/domain/health';
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

function vitalsToDraft(vitals: VitalValues | null): CheckinDraftFields {
  if (!vitals) return { ...EMPTY_DRAFT };
  return {
    sleep_hours: String(vitals.sleep_hours),
    mood: vitals.mood,
    heart_rate: String(vitals.heart_rate),
    bp_systolic: String(vitals.bp_systolic),
    bp_diastolic: String(vitals.bp_diastolic),
    glucose: String(vitals.glucose),
    temperature: String(vitals.temperature),
  };
}

export function useCheckinDraft(
  initialVitals: VitalValues | null,
  onSaved: (nextState: PublicUserState) => void
) {
  const [draft, setDraft] = useState<CheckinDraftFields>(() => vitalsToDraft(initialVitals));
  const [previewEvaluation, setPreviewEvaluation] = useState<HealthEvaluation>(() =>
    evaluateHealth(initialVitals ?? {})
  );
  const [saving, setSaving] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    setDraft(vitalsToDraft(initialVitals));
    setPreviewEvaluation(evaluateHealth(initialVitals ?? {}));
  }, [initialVitals]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const res = await apiEvaluate({ ...draft });
        setPreviewEvaluation(res.evaluation);
      } catch (err) {
        if (err instanceof ApiError && err.data.evaluation) {
          setPreviewEvaluation(err.data.evaluation as HealthEvaluation);
        }
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const setField = useCallback(<K extends keyof CheckinDraftFields>(key: K, value: CheckinDraftFields[K]) => {
    setSubmitFeedback(null);
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const loadBaseline = useCallback((vitals: VitalValues) => {
    setSubmitFeedback(null);
    setDraft(vitalsToDraft(vitals));
  }, []);

  const submitCheckin = useCallback(async () => {
    setSaving(true);
    setSubmitFeedback(null);
    const submissionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    try {
      const res = await apiSaveCheckin({ vitals: { ...draft }, clientSubmissionId: submissionId });
      setPreviewEvaluation(res.evaluation);
      onSaved(res.state);
      setSubmitFeedback({
        type: 'success',
        message: res.consolidated
          ? 'Chequeo de hoy actualizado en tu historial diario.'
          : 'Nuevo chequeo diario guardado correctamente.',
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
  }, [draft, onSaved]);

  return {
    draft,
    previewEvaluation,
    saving,
    submitFeedback,
    setField,
    loadBaseline,
    submitCheckin,
  };
}
