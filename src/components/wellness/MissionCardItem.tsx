'use client';

import type { MissionItem } from '@/domain/missions/mission-catalog';
import { AresIcon } from '../ui/Icons';

export function MissionCardItem({
  mission,
  busy,
  onComplete,
}: {
  mission: MissionItem;
  busy: boolean;
  onComplete: (missionId: string) => void;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 ${
        mission.completed
          ? 'border-emerald-500/40 bg-emerald-950/20'
          : 'border-[#1E2E4E] bg-[#060A12]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
            mission.completed
              ? 'border-emerald-500/40 bg-emerald-900/40 text-emerald-300'
              : 'border-[#1E2E4E] bg-[#0B1220] text-[#38BDF8]'
          }`}
        >
          <AresIcon name={mission.iconKey} size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-100">{mission.title}</p>
          <p className="text-xs text-slate-400">Recompensa única diaria: +{mission.xpReward} XP</p>
        </div>
      </div>

      <button
        type="button"
        disabled={mission.completed || busy}
        onClick={() => onComplete(mission.id)}
        className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
          mission.completed
            ? 'border border-emerald-500/40 bg-emerald-950/60 text-emerald-200 cursor-default'
            : 'bg-[#0B3D91] text-white hover:bg-[#105BD8] disabled:opacity-50'
        }`}
      >
        {mission.completed ? 'Completada hoy' : `Completar (+${mission.xpReward} XP)`}
      </button>
    </div>
  );
}
