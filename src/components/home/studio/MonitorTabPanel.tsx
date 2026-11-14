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
    activeNasaReplay && nasaTimeline && nasaTimeline.length > 0
      ? nasaTimeline.slice(-14).map((p) => ({
          label: p.observation.relativeLabel,
          score: p.evaluation.readinessScore,
          hr: p.observation.vitals.heart_rate ?? null,
          glucose: p.observation.vitals.glucose ?? null,
          status: p.evaluation.overallStatus,
        }))
      : [...(userState?.observations ?? [])]
          .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
          .slice(-14)
          .map((obs) => ({
            label: obs.capturedAt.slice(11, 16) || obs.dateKey,
            score: obs.readinessScore,
            hr: obs.vitals.heart_rate ?? null,
            glucose: obs.vitals.glucose ?? null,
            status: obs.overallStatus,
          }));

  const obsNewestFirst = [...(userState?.observations ?? [])].sort((a, b) =>
    b.capturedAt.localeCompare(a.capturedAt)
  );

  return (
    <section className="right-stack">
      <MonitorChartCard
        evaluation={evaluation}
        rawPoints={rawPoints}
        totalObsCount={obsNewestFirst.length}
        activeNasaReplay={activeNasaReplay}
        onNavigateTab={onNavigateTab}
      />

      <div className="card">
        <div className="group-head" style={{ marginBottom: 10 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            📋 Bitácora Real Intra-día e Historial
          </h2>
          <span className="val-pill">{userState?.history.length ?? 0} días · {obsNewestFirst.length} tomas</span>
        </div>

        {obsNewestFirst.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
            {userState
              ? 'Bitácora limpia: aún no has guardado observaciones. Cada toma real registra fecha exacta, contexto clínico y variables medidas (sin rellenar las omitidas).'
              : 'Inicia sesión en Controles del Cuerpo o explora los 3,965 casos NASA mientras tu bitácora personal permanece en blanco.'}
          </p>
        ) : (
          <div className="nasa-table-wrap">
            <table className="nasa-table">
              <thead>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Estado</th>
                  <th>Cobertura</th>
                  <th>Contexto</th>
                  <th>Signos medidos</th>
                </tr>
              </thead>
              <tbody>
                {obsNewestFirst.slice(0, 15).map((obs) => {
                  const lvl = statusToLevel(obs.overallStatus);
                  const moodLabel = obs.vitals.mood
                    ? MOOD_LABELS_FULL[DOMAIN_MOOD_TO_INDEX[obs.vitals.mood]]
                    : null;
                  const vitParts = [
                    typeof obs.vitals.heart_rate === 'number' ? `FC ${obs.vitals.heart_rate}` : null,
                    typeof obs.vitals.bp_systolic === 'number' && typeof obs.vitals.bp_diastolic === 'number'
                      ? `PA ${obs.vitals.bp_systolic}/${obs.vitals.bp_diastolic}`
                      : null,
                    typeof obs.vitals.glucose === 'number' ? `Gluc ${obs.vitals.glucose}` : null,
                    typeof obs.vitals.temperature === 'number' ? `${obs.vitals.temperature.toFixed(1)}°C` : null,
                    typeof obs.vitals.sleep_hours === 'number' ? `Sueño ${obs.vitals.sleep_hours}h` : null,
                    moodLabel ? `Ánimo ${moodLabel}` : null,
                  ].filter(Boolean);

                  return (
                    <tr key={obs.observationId}>
                      <td className="mono">{obs.capturedAt.slice(0, 16).replace('T', ' ')}</td>
                      <td>
                        <span className="meta-pill" style={{ background: bgForLevel(lvl) }}>
                          {obs.overallStatus}
                        </span>
                      </td>
                      <td className="mono">{obs.coveragePct}%</td>
                      <td>{obs.context.activityState} / {obs.context.posture}</td>
                      <td>{vitParts.length > 0 ? vitParts.join(' · ') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
