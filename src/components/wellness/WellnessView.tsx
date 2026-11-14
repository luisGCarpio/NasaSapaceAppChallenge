'use client';

import { useState } from 'react';
import { REFERENCES } from '@/domain/health';
import { useAres } from '@/context/AresContext';
import { SectionCard } from '../ui/SectionCard';
import { StatusBadge } from '../ui/StatusBadge';
import { DailyMissionsList } from './DailyMissionsList';
import { StreakSummaryCard } from './StreakSummaryCard';

export function WellnessView() {
  const { state, activeSimulation, openCommsWithMessage, completeMission, resetMissions } = useAres();
  const [busy, setBusy] = useState(false);
  const [missionNote, setMissionNote] = useState<string | null>(null);

  if (!state) return null;

  const activeEval = activeSimulation?.evaluation ?? state.evaluation;

  async function handleComplete(missionId: string) {
    setBusy(true);
    setMissionNote(null);
    try {
      const res = await completeMission(missionId);
      setMissionNote(
        res.alreadyAwardedToday
          ? 'Misión marcada como completada (el XP diario ya fue otorgado hoy).'
          : `Completada: +${res.awardedXp} XP agregados a tu perfil.`
      );
    } catch (err) {
      setMissionNote(err instanceof Error ? err.message : 'No se pudo completar la misión.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setBusy(true);
    setMissionNote(null);
    try {
      await resetMissions();
      setMissionNote('Lista visual reiniciada (tu XP previo del día permanece protegido).');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <StreakSummaryCard
        gamification={state.gamification}
        commsCount={state.commsLog.length}
        onOpenComms={() => openCommsWithMessage(activeEval.commsMessage)}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <DailyMissionsList
            missions={state.gamification.missions}
            busy={busy}
            statusMessage={missionNote}
            onComplete={(id) => void handleComplete(id)}
            onReset={() => void handleReset()}
          />
        </div>

        <div className="space-y-5 lg:col-span-5">
          <SectionCard
            title="Bitácora de Avisos"
            subtitle="Últimos envíos o copias de reporte al equipo"
          >
            {state.commsLog.length === 0 ? (
              <p className="text-xs text-slate-400">Aún no se han registrado reportes enviados.</p>
            ) : (
              <ul className="space-y-2.5">
                {[...state.commsLog]
                  .reverse()
                  .slice(0, 5)
                  .map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={entry.overallStatus} compact />
                        <span className="font-mono text-[11px] text-slate-400">
                          {new Date(entry.timestamp).toLocaleTimeString('es-CO')}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-slate-300">{entry.message}</p>
                    </li>
                  ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Referencias Oficiales NASA / CSA">
            <ul className="space-y-2 text-xs">
              {Object.values(REFERENCES).map((ref) => (
                <li key={ref.url}>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-300 underline underline-offset-2 hover:text-sky-200"
                  >
                    {ref.source}
                  </a>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
