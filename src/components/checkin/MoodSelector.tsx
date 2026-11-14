'use client';

import type { MoodValue } from '@/domain/health';

const MOOD_OPTIONS: Array<{ value: MoodValue; label: string }> = [
  { value: 'excelente', label: 'Excelente' },
  { value: 'bien', label: 'Bien' },
  { value: 'cansado', label: 'Cansado' },
  { value: 'estresado', label: 'Estresado' },
  { value: 'agotado', label: 'Agotado' },
];

export function MoodSelector({
  value,
  error,
  onChange,
}: {
  value: MoodValue | '';
  error?: string;
  onChange: (next: MoodValue) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-slate-100">Estado de ánimo</span>
        <span className="text-xs text-slate-400">Autoevaluación diaria</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Estado de ánimo">
        {MOOD_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                selected
                  ? 'border-[#38BDF8] bg-[#0B3D91] text-white'
                  : 'border-[#1E2E4E] bg-[#060A12] text-slate-300 hover:border-slate-500'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="text-xs font-medium text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
