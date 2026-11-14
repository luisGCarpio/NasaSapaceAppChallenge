'use client';

import type { VITAL_SPECS } from '@/domain/health';
import { NumericField } from '../ui/NumericField';

export function BloodPressureGroup({
  systolic,
  diastolic,
  systolicError,
  diastolicError,
  specs,
  onChangeSystolic,
  onChangeDiastolic,
}: {
  systolic: string;
  diastolic: string;
  systolicError?: string;
  diastolicError?: string;
  specs: typeof VITAL_SPECS;
  onChangeSystolic: (val: string) => void;
  onChangeDiastolic: (val: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12]/60 p-3.5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Presión Arterial (sin autoajuste entre valores)
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumericField
          id="bp_systolic"
          label={specs.bp_systolic.label}
          unit={specs.bp_systolic.unit}
          value={systolic}
          min={specs.bp_systolic.min}
          max={specs.bp_systolic.max}
          step={specs.bp_systolic.step}
          optimalText={specs.bp_systolic.optimalText}
          error={systolicError}
          onChange={onChangeSystolic}
        />
        <NumericField
          id="bp_diastolic"
          label={specs.bp_diastolic.label}
          unit={specs.bp_diastolic.unit}
          value={diastolic}
          min={specs.bp_diastolic.min}
          max={specs.bp_diastolic.max}
          step={specs.bp_diastolic.step}
          optimalText={specs.bp_diastolic.optimalText}
          error={diastolicError}
          onChange={onChangeDiastolic}
        />
      </div>
    </div>
  );
}
