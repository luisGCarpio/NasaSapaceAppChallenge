'use client';

import type { GamificationState } from '@/domain/missions/mission-catalog';
import { SectionCard } from '../ui/SectionCard';

export function StreakSummaryCard({
  gamification,
  commsCount,
  onOpenComms,
}: {
  gamification: GamificationState;
  commsCount: number;
  onOpenComms: () => void;
}) {
  const progressPct = Math.min(
    100,
    Math.round((gamification.xpProgressInLevel / (gamification.xpForNextLevel || 100)) * 100)
  );

  return (
    <SectionCard
      title="Progreso de Hábitos y Racha"
      subtitle="Refuerzo positivo diario — independiente de tu estado fisiológico real"
      action={
        <button
          type="button"
          onClick={onOpenComms}
          className="rounded-xl bg-[#0B3D91] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#105BD8]"
        >
          Reportar a Tierra / Equipo
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3.5">
          <p className="text-xs text-slate-400">Nivel de Disciplina</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-100">
            Nivel {gamification.level}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-[#38BDF8]" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-1.5 font-mono text-[11px] tabular-nums text-slate-400">
            {gamification.xp} XP totales ({gamification.xpProgressInLevel}/
            {gamification.xpForNextLevel} sig. nivel)
          </p>
        </div>

        <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3.5">
          <p className="text-xs text-slate-400">Racha Activa</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-300">
            {gamification.streak} días
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Última actividad: {gamification.lastStreakDate ?? 'Sin actividad previa'}
          </p>
        </div>

        <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3.5">
          <p className="text-xs text-slate-400">Reportes Enviados</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-100">
            {commsCount}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Registros auditados en bitácora de tripulación
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
