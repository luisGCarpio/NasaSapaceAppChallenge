'use client';

import type { PriorObservationInput } from '@/domain/health/context-specs';
import type {
  NasaSubjectSummary,
  NasaTimelinePoint,
} from '@/server/repositories/nasa-datasets-repo';
import { bgForLevel, statusToLevel } from './studio-types';
import { AresIcon } from '@/components/ui/Icons';

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
  activeObservationId,
  onChangeSubject,
  onLoadPointToAstronaut,
}: NasaReplayListProps) {
  return (
    <div className="nasa-replay">
      <div className="nasa-replay-heading">
        <div>
          <h2>Explorar casos NASA</h2>
          <p>Elige un sujeto y carga una medición.</p>
        </div>
        <span>{subjects.length} sujetos</span>
      </div>

      <label className="nasa-subject-label">
        Sujeto
        <select
          className="context-select"
          value={selectedSubject}
          onChange={(e) => onChangeSubject(e.target.value)}
        >
          {subjects.map((subj) => (
            <option key={subj.subjectId} value={subj.subjectId}>
              {subj.subjectId} · {subj.cohortGroup}
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
                    {pt.evaluation.overallLabel}
                  </span>
                  <strong style={{ fontSize: '0.95rem' }}>
                    {pt.observation.relativeLabel} · {pt.observation.studyId}
                  </strong>
                  <span className="mono" style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                    {pt.evaluation.coverage.presentCount}/7
                  </span>
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginTop: 3 }}>
                  {vitStr || 'Sin signos numéricos'}
                </div>
              </div>
              <button
                type="button"
                className="btn-tactile"
                onClick={() => onLoadPointToAstronaut(pt, buildPrior(), timeline)}
              >
                <AresIcon name="arrow-right" /> Ver caso
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
