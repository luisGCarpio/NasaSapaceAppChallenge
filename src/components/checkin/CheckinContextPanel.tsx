'use client';

import {
  ACTIVITY_OPTIONS,
  COMMON_SYMPTOMS,
  GLUCOSE_TIMING_OPTIONS,
  POSTURE_OPTIONS,
  TEMP_METHOD_OPTIONS,
} from '@/domain/health';
import type {
  ActivityState,
  GlucoseTiming,
  ObservationContext,
  PostureState,
  TempMethod,
} from '@/domain/nasa/nasa-types';

export function CheckinContextPanel({
  context,
  onChange,
}: {
  context: ObservationContext;
  onChange: <K extends keyof ObservationContext>(key: K, val: ObservationContext[K]) => void;
}) {
  function toggleSymptom(label: string) {
    const exists = context.symptoms.includes(label);
    const next = exists
      ? context.symptoms.filter((s) => s !== label)
      : [...context.symptoms, label];
    onChange('symptoms', next);
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-200">
          Contexto de medición (evita falsas alarmas)
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={context.confirmedRepeated}
            onChange={(e) => onChange('confirmedRepeated', e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-400"
          />
          <span>2.ª toma confirmatoria</span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="ctx-activity" className="block text-[11px] text-slate-400">
            Actividad reciente
          </label>
          <select
            id="ctx-activity"
            value={context.activityState}
            onChange={(e) => onChange('activityState', e.target.value as ActivityState)}
            className="mt-1 w-full rounded-lg border border-[#1E2E4E] bg-[#0B1220] px-2.5 py-2 text-xs text-slate-100"
          >
            {ACTIVITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ctx-posture" className="block text-[11px] text-slate-400">
            Postura
          </label>
          <select
            id="ctx-posture"
            value={context.posture}
            onChange={(e) => onChange('posture', e.target.value as PostureState)}
            className="mt-1 w-full rounded-lg border border-[#1E2E4E] bg-[#0B1220] px-2.5 py-2 text-xs text-slate-100"
          >
            {POSTURE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ctx-glucose" className="block text-[11px] text-slate-400">
            Momento de glucemia
          </label>
          <select
            id="ctx-glucose"
            value={context.glucoseTiming}
            onChange={(e) => onChange('glucoseTiming', e.target.value as GlucoseTiming)}
            className="mt-1 w-full rounded-lg border border-[#1E2E4E] bg-[#0B1220] px-2.5 py-2 text-xs text-slate-100"
          >
            {GLUCOSE_TIMING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ctx-temp" className="block text-[11px] text-slate-400">
            Método temperatura
          </label>
          <select
            id="ctx-temp"
            value={context.tempMethod}
            onChange={(e) => onChange('tempMethod', e.target.value as TempMethod)}
            className="mt-1 w-full rounded-lg border border-[#1E2E4E] bg-[#0B1220] px-2.5 py-2 text-xs text-slate-100"
          >
            {TEMP_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="text-[11px] text-slate-400">Síntomas reportados (opcional)</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {COMMON_SYMPTOMS.map((sym) => {
            const active = context.symptoms.includes(sym);
            return (
              <button
                key={sym}
                type="button"
                onClick={() => toggleSymptom(sym)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  active
                    ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                    : 'border-[#1E2E4E] bg-[#0B1220] text-slate-400 hover:text-slate-200'
                }`}
              >
                {sym}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
