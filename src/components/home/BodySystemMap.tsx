'use client';

import { STATUS, type HealthEvaluation, type HealthStatus, type SystemId } from '@/domain/health';
import { SectionCard } from '../ui/SectionCard';
import { StatusBadge } from '../ui/StatusBadge';

const NODE_FILL: Record<HealthStatus, string> = {
  [STATUS.GREEN]: '#26D07C',
  [STATUS.YELLOW]: '#FFBE2E',
  [STATUS.RED]: '#FC3D21',
  [STATUS.INSUFFICIENT_DATA]: '#64748B',
};

const SYSTEM_COORDS: Array<{ id: SystemId; label: string; cy: number }> = [
  { id: 'mind', label: 'Mente y Descanso', cy: 48 },
  { id: 'heart', label: 'Corazón y Circulación', cy: 108 },
  { id: 'body', label: 'Cuerpo y Energía', cy: 170 },
];

export function BodySystemMap({
  evaluation,
  selectedSystem,
  onSelectSystem,
}: {
  evaluation: HealthEvaluation;
  selectedSystem: SystemId;
  onSelectSystem: (id: SystemId) => void;
}) {
  return (
    <SectionCard
      title="Mapa por Sistemas"
      subtitle="Selecciona un nodo para revisar detalle y referencia oficial"
    >
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
        <div className="flex justify-center sm:col-span-5">
          <svg
            viewBox="0 0 180 260"
            className="h-56 w-40"
            role="img"
            aria-label="Esquema corporal interactivo de tres sistemas fisiológicos"
          >
            <g fill="none" stroke="#1E2E4E" strokeWidth="2.5">
              <circle cx="90" cy="48" r="24" />
              <path d="M52 92 C52 78, 128 78, 128 92 L120 175 C118 192, 62 192, 60 175 Z" />
              <line x1="68" y1="188" x2="64" y2="245" />
              <line x1="112" y1="188" x2="116" y2="245" />
            </g>

            {SYSTEM_COORDS.map((node) => {
              const status = evaluation.systems[node.id].status;
              const isSelected = selectedSystem === node.id;
              return (
                <g
                  key={node.id}
                  onClick={() => onSelectSystem(node.id)}
                  className="cursor-pointer"
                >
                  <circle
                    cx="90"
                    cy={node.cy}
                    r={isSelected ? 14 : 10}
                    fill={NODE_FILL[status]}
                    fillOpacity={isSelected ? 0.35 : 0.2}
                    stroke={NODE_FILL[status]}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <circle cx="90" cy={node.cy} r={5} fill={NODE_FILL[status]} />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-2 sm:col-span-7">
          {SYSTEM_COORDS.map((node) => {
            const sys = evaluation.systems[node.id];
            const active = selectedSystem === node.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectSystem(node.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                  active
                    ? 'border-[#38BDF8] bg-[#101A2E]'
                    : 'border-[#1E2E4E] bg-[#060A12] hover:border-slate-500'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-100">{sys.systemName}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{sys.title}</p>
                </div>
                <StatusBadge status={sys.status} compact />
              </button>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}
