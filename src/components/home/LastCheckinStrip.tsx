import Link from 'next/link';
import type { PartialVitalValues, VitalValues } from '@/domain/health';
import { SectionCard } from '../ui/SectionCard';

export function LastCheckinStrip({
  vitals,
  lastCheckinAt,
  isSimulation,
}: {
  vitals: VitalValues | PartialVitalValues | null;
  lastCheckinAt: string | null;
  isSimulation: boolean;
}) {
  const formattedTime =
    !isSimulation && lastCheckinAt
      ? new Date(lastCheckinAt).toLocaleString('es-CO', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : isSimulation
        ? 'Simulación activa'
        : 'Sin registros guardados';

  const metrics = [
    { label: 'Sueño', value: vitals?.sleep_hours != null ? `${vitals.sleep_hours} h` : 'N/D' },
    { label: 'Ánimo', value: vitals?.mood ? String(vitals.mood) : 'N/D' },
    { label: 'Pulso', value: vitals?.heart_rate != null ? `${vitals.heart_rate} BPM` : 'N/D' },
    {
      label: 'Presión Arterial',
      value:
        vitals?.bp_systolic != null && vitals?.bp_diastolic != null
          ? `${vitals.bp_systolic}/${vitals.bp_diastolic} mmHg`
          : 'N/D',
    },
    { label: 'Glucosa', value: vitals?.glucose != null ? `${vitals.glucose} mg/dL` : 'N/D' },
    { label: 'Temperatura', value: vitals?.temperature != null ? `${vitals.temperature} °C` : 'N/D' },
  ];

  return (
    <SectionCard
      title="Últimos 6 indicadores ingresados"
      subtitle={`Marca temporal: ${formattedTime}`}
      action={
        <Link
          href="/registro"
          className="text-xs font-semibold text-sky-300 hover:text-sky-200 underline underline-offset-2"
        >
          Editar valores
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3 py-2.5"
          >
            <p className="text-[11px] text-slate-400">{m.label}</p>
            <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-slate-100 capitalize">
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
