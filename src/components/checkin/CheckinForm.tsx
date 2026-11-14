'use client';

import type { FormEvent } from 'react';
import type { HealthEvaluation, VITAL_SPECS, VitalValues } from '@/domain/health';
import type { CheckinDraftFields } from '@/hooks/useCheckinDraft';
import { AlertBanner } from '../ui/AlertBanner';
import { NumericField } from '../ui/NumericField';
import { SectionCard } from '../ui/SectionCard';
import { BloodPressureGroup } from './BloodPressureGroup';
import { MoodSelector } from './MoodSelector';

export function CheckinForm({
  draft,
  specs,
  evaluation,
  baselineVitals,
  saving,
  feedback,
  onChangeField,
  onLoadBaseline,
  onSubmit,
}: {
  draft: CheckinDraftFields;
  specs: typeof VITAL_SPECS;
  evaluation: HealthEvaluation;
  baselineVitals: VitalValues | null;
  saving: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
  onChangeField: <K extends keyof CheckinDraftFields>(key: K, val: CheckinDraftFields[K]) => void;
  onLoadBaseline: (vitals: VitalValues) => void;
  onSubmit: () => Promise<boolean>;
}) {
  function handleFormSubmit(event: FormEvent) {
    event.preventDefault();
    void onSubmit();
  }

  return (
    <SectionCard
      title="Registro de Chequeo Diario"
      subtitle="Ingresa tus 6 indicadores fisiológicos de forma manual"
      action={
        baselineVitals ? (
          <button
            type="button"
            onClick={() => onLoadBaseline(baselineVitals)}
            className="rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3 py-1.5 text-xs font-medium text-sky-300 hover:border-[#38BDF8]"
          >
            Cargar último registro
          </button>
        ) : null
      }
    >
      <form onSubmit={handleFormSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumericField
            id="sleep_hours"
            label={specs.sleep_hours.label}
            unit={specs.sleep_hours.unit}
            value={draft.sleep_hours}
            min={specs.sleep_hours.min}
            max={specs.sleep_hours.max}
            step={specs.sleep_hours.step}
            optimalText={specs.sleep_hours.optimalText}
            error={evaluation.fieldErrors.sleep_hours}
            onChange={(val) => onChangeField('sleep_hours', val)}
          />

          <NumericField
            id="heart_rate"
            label={specs.heart_rate.label}
            unit={specs.heart_rate.unit}
            value={draft.heart_rate}
            min={specs.heart_rate.min}
            max={specs.heart_rate.max}
            step={specs.heart_rate.step}
            optimalText={specs.heart_rate.optimalText}
            error={evaluation.fieldErrors.heart_rate}
            onChange={(val) => onChangeField('heart_rate', val)}
          />
        </div>

        <MoodSelector
          value={draft.mood}
          error={evaluation.fieldErrors.mood}
          onChange={(val) => onChangeField('mood', val)}
        />

        <BloodPressureGroup
          systolic={draft.bp_systolic}
          diastolic={draft.bp_diastolic}
          systolicError={evaluation.fieldErrors.bp_systolic}
          diastolicError={evaluation.fieldErrors.bp_diastolic}
          specs={specs}
          onChangeSystolic={(val) => onChangeField('bp_systolic', val)}
          onChangeDiastolic={(val) => onChangeField('bp_diastolic', val)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumericField
            id="glucose"
            label={specs.glucose.label}
            unit={specs.glucose.unit}
            value={draft.glucose}
            min={specs.glucose.min}
            max={specs.glucose.max}
            step={specs.glucose.step}
            optimalText={specs.glucose.optimalText}
            error={evaluation.fieldErrors.glucose}
            onChange={(val) => onChangeField('glucose', val)}
          />

          <NumericField
            id="temperature"
            label={specs.temperature.label}
            unit={specs.temperature.unit}
            value={draft.temperature}
            min={specs.temperature.min}
            max={specs.temperature.max}
            step={specs.temperature.step}
            optimalText={specs.temperature.optimalText}
            error={evaluation.fieldErrors.temperature}
            onChange={(val) => onChangeField('temperature', val)}
          />
        </div>

        {feedback ? (
          <AlertBanner
            tone={feedback.type === 'success' ? 'success' : 'danger'}
            title={feedback.message}
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#0B3D91] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#105BD8] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Evaluando y guardando...' : 'Guardar chequeo diario'}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
