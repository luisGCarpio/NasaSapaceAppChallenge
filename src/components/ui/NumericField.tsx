'use client';

interface NumericFieldProps {
  id: string;
  label: string;
  unit: string;
  value: string;
  min: number;
  max: number;
  step: number;
  optimalText: string;
  error?: string;
  onChange: (value: string) => void;
}

export function NumericField({
  id,
  label,
  unit,
  value,
  min,
  max,
  step,
  optimalText,
  error,
  onChange,
}: NumericFieldProps) {
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-100">
          {label}
        </label>
        <span className="text-xs text-slate-400">Ref: {optimalText}</span>
      </div>

      <div className="relative flex items-center">
        <input
          id={id}
          name={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          placeholder={`${min} – ${max}`}
          className={`w-full rounded-xl border bg-[#060A12] px-3.5 py-2.5 pr-16 font-mono text-sm tabular-nums text-slate-100 placeholder:text-slate-500 transition-colors ${
            hasError
              ? 'border-[#FC3D21] focus:border-[#FC3D21]'
              : 'border-[#1E2E4E] hover:border-slate-500 focus:border-[#38BDF8]'
          }`}
        />
        <span className="pointer-events-none absolute right-3 text-xs font-medium text-slate-400">
          {unit}
        </span>
      </div>

      {hasError ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
