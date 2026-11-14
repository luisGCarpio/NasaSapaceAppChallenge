'use client';

import type { CheckinEntry } from '@/server/storage/types';
import { StatusBadge } from '../ui/StatusBadge';

export function CheckinHistoryTable({
  entries,
  onInspect,
}: {
  entries: CheckinEntry[];
  onInspect: (entry: CheckinEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#1E2E4E] bg-[#060A12] p-4 text-center text-xs text-slate-400">
        No existen registros en el historial todavía. Realiza tu primer chequeo diario.
      </p>
    );
  }

  const sortedDesc = [...entries].reverse();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-xs">
        <thead>
          <tr className="border-b border-[#1E2E4E] text-slate-400">
            <th className="py-2.5 pr-3 font-medium">Fecha</th>
            <th className="py-2.5 px-3 font-medium">Estado</th>
            <th className="py-2.5 px-3 font-medium">Índice</th>
            <th className="py-2.5 px-3 font-medium">Sueño</th>
            <th className="py-2.5 px-3 font-medium">Pulso</th>
            <th className="py-2.5 px-3 font-medium">PA</th>
            <th className="py-2.5 px-3 font-medium">Glucosa</th>
            <th className="py-2.5 px-3 font-medium">Temp</th>
            <th className="py-2.5 pl-3 text-right font-medium">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E2E4E]/60">
          {sortedDesc.map((entry) => (
            <tr key={entry.id} className="hover:bg-[#101A2E]/60">
              <td className="py-3 pr-3 font-mono tabular-nums text-slate-200">
                {entry.dateKey}
                {entry.updatesCount > 1 ? (
                  <span className="ml-1.5 text-[10px] text-slate-400">({entry.updatesCount}x)</span>
                ) : null}
              </td>
              <td className="py-3 px-3">
                <StatusBadge status={entry.overallStatus} compact />
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-slate-100">
                {entry.readinessScore !== null ? `${entry.readinessScore}/100` : 'N/D'}
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                {entry.vitals.sleep_hours} h
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                {entry.vitals.heart_rate} BPM
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                {entry.vitals.bp_systolic}/{entry.vitals.bp_diastolic}
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                {entry.vitals.glucose} mg/dL
              </td>
              <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                {entry.vitals.temperature} °C
              </td>
              <td className="py-3 pl-3 text-right">
                <button
                  type="button"
                  onClick={() => onInspect(entry)}
                  className="rounded-lg border border-[#1E2E4E] bg-[#060A12] px-2.5 py-1 text-xs font-medium text-sky-300 hover:border-[#38BDF8]"
                >
                  Detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
