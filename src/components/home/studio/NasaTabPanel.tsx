'use client';

import { useEffect, useState } from 'react';
import type { PriorObservationInput } from '@/domain/health/context-specs';
import type { BenchmarkMetrics } from '@/domain/nasa/benchmark-runner';
import type { NasaAuditInventory } from '@/domain/nasa/nasa-types';
import { apiGetNasaCatalog, apiGetNasaSubjectTimeline } from '@/lib/client-api';
import type {
  NasaSubjectSummary,
  NasaTimelinePoint,
} from '@/server/repositories/nasa-datasets-repo';
import { NasaReplayList } from './NasaReplayList';

interface NasaTabPanelProps {
  activeSubjectId: string | null;
  activeObservationId: string | null;
  onLoadPointToAstronaut: (
    point: NasaTimelinePoint,
    priorObservations: PriorObservationInput[],
    timeline: NasaTimelinePoint[]
  ) => void;
  onClearReplay: () => void;
}

export function NasaTabPanel({
  activeSubjectId,
  activeObservationId,
  onLoadPointToAstronaut,
  onClearReplay,
}: NasaTabPanelProps) {
  const [inventory, setInventory] = useState<NasaAuditInventory | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkMetrics | null>(null);
  const [subjects, setSubjects] = useState<NasaSubjectSummary[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [timeline, setTimeline] = useState<NasaTimelinePoint[]>([]);
  const [v2Pts, setV2Pts] = useState(0);
  const [v3Pts, setV3Pts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGetNasaCatalog()
      .then((res) => {
        if (cancelled) return;
        setInventory(res.inventory);
        setBenchmark(res.benchmark);
        setSubjects(res.subjects);
        const preferred =
          activeSubjectId && res.subjects.some((s) => s.subjectId === activeSubjectId)
            ? activeSubjectId
            : res.subjects[0]?.subjectId ?? '';
        setSelectedSubject(preferred);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando NASA catalog');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSubjectId]);

  useEffect(() => {
    if (!selectedSubject) return;
    let cancelled = false;
    apiGetNasaSubjectTimeline(selectedSubject)
      .then((res) => {
        if (cancelled) return;
        setTimeline(res.points);
        setV2Pts(res.v2EvaluablePoints);
        setV3Pts(res.v3EvaluablePoints);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando sujeto NASA');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSubject]);

  if (loading) {
    return (
      <section className="card">
        <p style={{ fontWeight: 800 }}>🛰️ Cargando auditoría y 3,965 observaciones reales NASA...</p>
      </section>
    );
  }

  if (error || !inventory || !benchmark) {
    return (
      <section className="card" style={{ background: 'var(--red-bg)' }}>
        <p style={{ fontWeight: 800 }}>No se pudo cargar datos NASA: {error ?? 'sin datos'}</p>
      </section>
    );
  }

  return (
    <section className="right-stack">
      <div className="card">
        <div className="group-head" style={{ marginBottom: 10 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            🛰️ Auditoría Real NASA OSDR &amp; NLSP (0 datos ficticios)
          </h2>
          {activeObservationId ? (
            <button type="button" className="btn-tactile" onClick={onClearReplay}>
              Salir de replay
            </button>
          ) : null}
        </div>

        <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginBottom: 10, fontWeight: 600 }}>
          Benchmark retrospectivo sobre {inventory.totalValidObservations.toLocaleString('es-MX')} observaciones limpias
          ({inventory.totalFilesProcessed} CSV, {inventory.totalRawRowsScanned.toLocaleString('es-MX')} filas auditadas,{' '}
          {benchmark.qualitativeSymptomsOnly} registros solo síntomas).
        </p>

        <div className="nasa-grid-stats">
          <div className="stat-box">
            <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontWeight: 800 }}>Cobertura v2 vs v3</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
              {benchmark.v2CoverageRatePct}% → {benchmark.v3CoverageRatePct}%
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>{benchmark.v3EvaluableCount}/{benchmark.withQuantitativeVitals} con vitals</div>
          </div>
          <div className="stat-box">
            <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontWeight: 800 }}>Contexto Tilt Ortostático</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
              {benchmark.tiltClassifiedAsOrthostaticNotRestPanic}/{benchmark.tiltWithHr100PlusTotal}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>FC&gt;100 diferenciadas del reposo</div>
          </div>
          <div className="stat-box">
            <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontWeight: 800 }}>Ayuno Glucosa (100–139)</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
              {benchmark.unknownGlucoseFlaggedContextualConfirmation}/{benchmark.unknownGlucose100to139Count}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>Sin falsa alarma sin ayuno</div>
          </div>
          <div className="stat-box">
            <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontWeight: 800 }}>Conflictos Ejercicio vs Alerta</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
              {benchmark.missionVsClinicalConflictsV2} → {benchmark.missionVsClinicalConflictsV3}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>RED: {benchmark.v3AlertsDetected.red} · YELLOW: {benchmark.v3AlertsDetected.yellow}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 8 }}>📚 6 Datasets Oficiales Ingestados</h3>
        <div className="nasa-table-wrap">
          <table className="nasa-table">
            <thead>
              <tr>
                <th>Estudio</th>
                <th>Población</th>
                <th>Obs. válidas</th>
                <th>Variables</th>
                <th>Hallazgos de ingesta</th>
              </tr>
            </thead>
            <tbody>
              {inventory.datasets.map((ds) => (
                <tr key={ds.studyId}>
                  <td>
                    <a href={ds.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--periwinkle)', fontWeight: 800 }}>
                      {ds.officialId} ↗
                    </a>
                    <div style={{ fontSize: '0.68rem', color: 'var(--ink-muted)' }}>{ds.sourceSystem}</div>
                  </td>
                  <td>{ds.population}</td>
                  <td className="mono">{ds.validObservationsExtracted} / {ds.rawRowsScanned}</td>
                  <td>{ds.availableVitals.join(', ') || 'síntomas'}</td>
                  <td>{ds.knownDefectsAndNotes[0] ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NasaReplayList
        subjects={subjects}
        selectedSubject={selectedSubject}
        timeline={timeline}
        v2Pts={v2Pts}
        v3Pts={v3Pts}
        activeObservationId={activeObservationId}
        onChangeSubject={setSelectedSubject}
        onLoadPointToAstronaut={onLoadPointToAstronaut}
      />
    </section>
  );
}
