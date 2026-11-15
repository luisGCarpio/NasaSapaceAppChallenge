'use client';

import type { ActiveNasaReplay } from '@/context/AresContext';
import type { HealthEvaluation } from '@/domain/health';
import type { NasaTimelinePoint } from '@/server/repositories/nasa-datasets-repo';
import type { PublicUserState } from '@/server/storage/types';
import { MonitorChartCard, type SeriesPoint } from './MonitorChartCard';
import {
  bgForLevel,
  DOMAIN_MOOD_TO_INDEX,
  MOOD_LABELS_FULL,
  statusToLevel,
  type TabKey,
} from './studio-types';

interface MonitorTabPanelProps {
  evaluation: HealthEvaluation;
  userState: PublicUserState | null;
  activeNasaReplay: ActiveNasaReplay | null;
  nasaTimeline: NasaTimelinePoint[] | null;
  onNavigateTab: (tab: TabKey) => void;
}

export function MonitorTabPanel({
  evaluation,
  userState,
  activeNasaReplay,
  nasaTimeline,
  onNavigateTab,
}: MonitorTabPanelProps) {
  const rawPoints: SeriesPoint[] =
    activeNasaReplay
      ? (nasaTimeline ?? []).slice(-14).map((p) => ({
          label: p.observation.relativeLabel,
          score: p.evaluation.readinessScore,
          hr: p.observation.vitals.heart_rate ?? null,
          glucose: p.observation.vitals.glucose ?? null,
          status: p.evaluation.overallStatus,
        }))
      : [...(userState?.observations ?? [])]
          .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
          .slice(-14)
          .map((obs) => {
            const d = new Date(obs.capturedAt);
            const label = Number.isNaN(d.getTime())
              ? obs.dateKey
              : d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            return {
              label,
              score: obs.readinessScore,
              hr: obs.vitals.heart_rate ?? null,
              glucose: obs.vitals.glucose ?? null,
              status: obs.overallStatus,
            };
          });

  const obsNewestFirst = [...(userState?.observations ?? [])].sort((a, b) =>
    b.capturedAt.localeCompare(a.capturedAt)
  );
  const nasaNewestFirst = [...(nasaTimeline ?? [])].reverse();

  return (
    <section className="right-stack monitor-layout">
      <MonitorChartCard
        evaluation={evaluation}
        rawPoints={rawPoints}
        totalObsCount={activeNasaReplay ? nasaNewestFirst.length : obsNewestFirst.length}
        activeNasaReplay={activeNasaReplay}
        onNavigateTab={onNavigateTab}
      />

      <div className="card">
        <div className="group-head" style={{ marginBottom: 10 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            Historial
          </h2>
          <span className="val-pill">{activeNasaReplay ? `NASA ${activeNasaReplay.subjectId} · ${nasaNewestFirst.length} tomas` : `${userState?.history.length ?? 0} días · ${obsNewestFirst.length} tomas personales`}</span>
        </div>

        {activeNasaReplay ? (
          nasaNewestFirst.length === 0 ? (
            <p className="empty-message">No hay tomas NASA disponibles para este caso.</p>
          ) : (
            <div className="observation-list">
              {nasaNewestFirst.slice(0, 15).map(({ observation, evaluation: pointEvaluation }) => {
                const v = observation.vitals;
                const parts = [
                  typeof v.heart_rate === 'number' ? `Pulso ${v.heart_rate}` : null,
                  typeof v.bp_systolic === 'number' ? `Presión ${v.bp_systolic}/${v.bp_diastolic ?? '—'}` : null,
                  typeof v.glucose === 'number' ? `Glucosa ${v.glucose}` : null,
                  typeof v.temperature === 'number' ? `${v.temperature.toFixed(1)} °C` : null,
                  typeof v.sleep_hours === 'number' ? `Sueño ${v.sleep_hours} h` : null,
                ].filter(Boolean);
                return (
                  <article key={observation.observationId} className="observation-item">
                    <div className="observation-heading">
                      <span>{observation.relativeLabel} · {observation.studyId}</span>
                      <span className="meta-pill" style={{ background: bgForLevel(statusToLevel(pointEvaluation.overallStatus)) }}>{pointEvaluation.overallStatus}</span>
                    </div>
                    <p>{parts.join(' · ') || 'Sin signos medidos'}</p>
                  </article>
                );
              })}
            </div>
          )
        ) : obsNewestFirst.length === 0 ? (
          <p className="empty-message">Aún no tienes mediciones guardadas.</p>
        ) : (
          <div className="observation-list">
            {obsNewestFirst.slice(0, 15).map((obs) => {
              const lvl = statusToLevel(obs.overallStatus);
              const moodLabel = obs.vitals.mood
                ? MOOD_LABELS_FULL[DOMAIN_MOOD_TO_INDEX[obs.vitals.mood]]
                : null;
              const vitParts = [
                typeof obs.vitals.heart_rate === 'number' ? `Pulso ${obs.vitals.heart_rate}` : null,
                typeof obs.vitals.bp_systolic === 'number' && typeof obs.vitals.bp_diastolic === 'number'
                  ? `Presión ${obs.vitals.bp_systolic}/${obs.vitals.bp_diastolic}`
                  : null,
                typeof obs.vitals.glucose === 'number' ? `Glucosa ${obs.vitals.glucose}` : null,
                typeof obs.vitals.temperature === 'number' ? `${obs.vitals.temperature.toFixed(1)} °C` : null,
                typeof obs.vitals.sleep_hours === 'number' ? `Sueño ${obs.vitals.sleep_hours} h` : null,
                moodLabel,
              ].filter(Boolean);

              return (
                <article key={obs.observationId} className="observation-item">
                  <div className="observation-heading">
                    <time dateTime={obs.capturedAt}>{new Date(obs.capturedAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    <span className="meta-pill" style={{ background: bgForLevel(lvl) }}>{obs.overallStatus}</span>
                  </div>
                  <p>{vitParts.join(' · ') || 'Sin signos medidos'}</p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
