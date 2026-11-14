'use client';

import type { PriorObservationInput } from '@/domain/health/context-specs';
import type {
  NasaSubjectSummary,
  NasaTimelinePoint,
} from '@/server/repositories/nasa-datasets-repo';
import { bgForLevel, statusToLevel } from './studio-types';

interface NasaReplayListProps {
  subjects: NasaSubjectSummary[];
  selectedSubject: string;
  timeline: NasaTimelinePoint[];
  v2Pts: number;
  v3Pts: number;
  activeObservationId: string | null;
  onChangeSubject: (id: string) => void;
  onLoadPointToAstronaut: (
    point: NasaTimelinePoint,
    priorObservations: PriorObservationInput[],
    timeline: NasaTimelinePoint[]
  ) => void;
}

export function NasaReplayList({
  subjects,
  selectedSubject,
  timeline,
  v2Pts,
  v3Pts,
  activeObservationId,
  onChangeSubject,
  onLoadPointToAstronaut,
}: NasaReplayListProps) {
  return (
    <div className="card">
      <div className="group-head" style={{ marginBottom: 10 }}>
        <h3 className="card-title" style={{ marginBottom: 0 }}>
          🧬 Replay Longitudinal por Sujeto ({subjects.length} sujetos)
        </h3>
        <span className="val-pill">v2: {v2Pts} · v3: {v3Pts} pts</span>
      </div>

      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, marginBottom: 10 }}>
        Seleccionar sujeto oficial NASA:
        <select
          className="context-select"
          value={selectedSubject}
          onChange={(e) => onChangeSubject(e.target.value)}
        >
          {subjects.map((subj) => (
            <option key={subj.subjectId} value={subj.subjectId}>
              {subj.subjectId} · {subj.cohortGroup} ({subj.vitalsCount} vitals · {subj.studyIds.join(', ')})
            </option>
          ))}
        </select>
      </label>

      <div className="replay-list">
        {timeline.map((pt, idx) => {
          const lvl = statusToLevel(pt.evaluation.overallStatus);
          const isSelected = activeObservationId === pt.observation.observationId;
          const v = pt.observation.vitals;
          const vitStr = [
            typeof v.heart_rate === 'number' ? `FC ${v.heart_rate}` : null,
            typeof v.bp_systolic === 'number' ? `PA ${v.bp_systolic}/${v.bp_diastolic ?? '—'}` : null,
            typeof v.temperature === 'number' ? `${v.temperature.toFixed(1)}°C` : null,
            typeof v.glucose === 'number' ? `Gluc ${v.glucose}` : null,
            typeof v.sleep_hours === 'number' ? `Sueño ${v.sleep_hours.toFixed(1)}h` : null,
          ]
            .filter(Boolean)
            .join(' · ');

          const buildPrior = (): PriorObservationInput[] =>
            timeline.slice(0, idx).map((p) => ({
              observationId: p.observation.observationId,
              sortOrder: p.observation.sortOrder,
              overallStatus: p.evaluation.overallStatus,
              vitals: p.observation.vitals,
              context: p.observation.context,
            }));

          return (
            <div
              key={pt.observation.observationId}
              className="replay-row"
              style={{ background: isSelected ? 'var(--lavender-soft)' : undefined }}
            >
              <div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="meta-pill" style={{ background: bgForLevel(lvl) }}>
                    {pt.evaluation.overallStatus}
                  </span>
                  <strong style={{ fontSize: '0.8rem' }}>
                    {pt.observation.relativeLabel} · {pt.observation.studyId}
                  </strong>
                  <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--ink-muted)' }}>
                    {pt.evaluation.coverage.presentCount}/7
                  </span>
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--ink-muted)', marginTop: 3 }}>
                  {vitStr || 'Sin signos numéricos'} · {pt.evaluation.crossConclusion.title}
                </div>
              </div>
              <button
                type="button"
                className="btn-tactile"
                onClick={() => onLoadPointToAstronaut(pt, buildPrior(), timeline)}
              >
                🚀 Cargar en Astronauta
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
