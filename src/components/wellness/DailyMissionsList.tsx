'use client';

import type { MissionItem } from '@/domain/missions/mission-catalog';
import { SectionCard } from '../ui/SectionCard';
import { MissionCardItem } from './MissionCardItem';

export function DailyMissionsList({
  missions,
  busy,
  statusMessage,
  onComplete,
  onReset,
}: {
  missions: MissionItem[];
  busy: boolean;
  statusMessage: string | null;
  onComplete: (missionId: string) => void;
  onReset: () => void;
}) {
  return (
    <SectionCard
      title="Acciones Diarias de Bienestar"
      subtitle="Cada hábito otorga XP una única vez por fecha calendario"
      action={
        <button
          type="button"
          disabled={busy}
          onClick={onReset}
          className="rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white disabled:opacity-50"
        >
          Reiniciar lista visual
        </button>
      }
    >
      <div className="space-y-3">
        {missions.map((mission) => (
          <MissionCardItem
            key={mission.id}
            mission={mission}
            busy={busy}
            onComplete={onComplete}
          />
        ))}
        {statusMessage ? (
          <p role="status" className="text-xs font-medium text-sky-300">
            {statusMessage}
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}
