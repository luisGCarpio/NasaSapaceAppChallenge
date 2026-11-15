'use client';

import { useEffect, useState } from 'react';
import type { HealthEvaluation, PartialVitalValues } from '@/domain/health';
import type { PriorObservationInput } from '@/domain/health/context-specs';
import type { BenchmarkMetrics } from '@/domain/nasa/benchmark-runner';
import type { NasaAuditInventory, ObservationContext } from '@/domain/nasa/nasa-types';
import { apiGetNasaCatalog, apiGetNasaSubjectTimeline } from '@/lib/client-api';
import type {
  NasaSubjectSummary,
  NasaTimelinePoint,
} from '@/server/repositories/nasa-datasets-repo';
import { NasaDecisionCard } from './NasaDecisionCard';
import { NasaReplayList } from './NasaReplayList';
import { AresIcon } from '@/components/ui/Icons';
import './nasa-panel.css';

interface NasaCatalogCache {
  inventory: NasaAuditInventory;
  benchmark: BenchmarkMetrics;
  subjects: NasaSubjectSummary[];
}

let cachedCatalog: NasaCatalogCache | null = null;

interface NasaTabPanelProps {
  vitals: PartialVitalValues;
  evaluation: HealthEvaluation;
  context?: Partial<ObservationContext>;
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
  vitals,
  evaluation,
  context,
  activeSubjectId,
  activeObservationId,
  onLoadPointToAstronaut,
  onClearReplay,
}: NasaTabPanelProps) {
  const [inventory, setInventory] = useState<NasaAuditInventory | null>(() => cachedCatalog?.inventory ?? null);
  const [benchmark, setBenchmark] = useState<BenchmarkMetrics | null>(() => cachedCatalog?.benchmark ?? null);
  const [subjects, setSubjects] = useState<NasaSubjectSummary[]>(() => cachedCatalog?.subjects ?? []);
  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    if (!cachedCatalog) return '';
    return activeSubjectId && cachedCatalog.subjects.some((s) => s.subjectId === activeSubjectId)
      ? activeSubjectId
      : cachedCatalog.subjects[0]?.subjectId ?? '';
  });
  const [timeline, setTimeline] = useState<NasaTimelinePoint[]>([]);
  const [v2Pts, setV2Pts] = useState(0);
  const [v3Pts, setV3Pts] = useState(0);
  const [loading, setLoading] = useState(() => !cachedCatalog);
  const [error, setError] = useState<string | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [reloadCatalogTick, setReloadCatalogTick] = useState(0);
  const [reloadTimelineTick, setReloadTimelineTick] = useState(0);

  useEffect(() => {
    if (cachedCatalog && reloadCatalogTick === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGetNasaCatalog()
      .then((res) => {
        if (cancelled) return;
        cachedCatalog = {
          inventory: res.inventory,
          benchmark: res.benchmark,
          subjects: res.subjects,
        };
        setInventory(res.inventory);
        setBenchmark(res.benchmark);
        setSubjects(res.subjects);
        setSelectedSubject((prev) => {
          if (activeSubjectId && res.subjects.some((s) => s.subjectId === activeSubjectId)) {
            return activeSubjectId;
          }
          if (prev && res.subjects.some((s) => s.subjectId === prev)) {
            return prev;
          }
          return res.subjects[0]?.subjectId ?? '';
        });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadCatalogTick]);

  useEffect(() => {
    if (!activeSubjectId || subjects.length === 0) return;
    if (subjects.some((s) => s.subjectId === activeSubjectId)) {
      setSelectedSubject(activeSubjectId);
      setError(null);
      setTimelineError(null);
    }
  }, [activeSubjectId, subjects]);

  useEffect(() => {
    if (!selectedSubject) return;
    let cancelled = false;
    setTimelineError(null);
    apiGetNasaSubjectTimeline(selectedSubject)
      .then((res) => {
        if (cancelled) return;
        setTimeline(res.points);
        setV2Pts(res.v2EvaluablePoints);
        setV3Pts(res.v3EvaluablePoints);
      })
      .catch((err) => {
        if (!cancelled) setTimelineError(err instanceof Error ? err.message : 'Error cargando sujeto NASA');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSubject, reloadTimelineTick]);

  if (loading) {
    return (
      <section className="card">
        <p style={{ fontWeight: 800 }}>Cargando datos NASA...</p>
      </section>
    );
  }

  if (error || !inventory || !benchmark) {
    return (
      <section className="card" style={{ background: 'var(--red-bg)' }}>
        <p style={{ fontWeight: 800, marginBottom: 12 }}>
          No se pudo cargar datos NASA: {error ?? 'sin datos'}
        </p>
        <button
          type="button"
          className="btn-tactile"
          onClick={() => {
            cachedCatalog = null;
            setError(null);
            setReloadCatalogTick((t) => t + 1);
          }}
        >
          <AresIcon name="sync" size={16} /> Reintentar
        </button>
      </section>
    );
  }

  return (
    <section className="right-stack nasa-layout">
      {activeObservationId ? (
        <button type="button" className="btn-tactile nasa-exit" onClick={onClearReplay}>
          <AresIcon name="close" /> Salir del caso
        </button>
      ) : null}

      {timelineError ? (
        <div className="card" style={{ background: 'var(--red-bg)' }}>
          <p style={{ fontWeight: 800, marginBottom: 10 }}>
            No se pudo cargar el sujeto {selectedSubject}: {timelineError}
          </p>
          <button
            type="button"
            className="btn-tactile"
            onClick={() => {
              setTimelineError(null);
              setReloadTimelineTick((t) => t + 1);
            }}
          >
            <AresIcon name="sync" size={16} /> Reintentar
          </button>
        </div>
      ) : null}

      <NasaReplayList
        subjects={subjects}
        selectedSubject={selectedSubject}
        timeline={timeline}
        v2Pts={v2Pts}
        v3Pts={v3Pts}
        activeObservationId={activeObservationId}
        onChangeSubject={(id) => {
          setError(null);
          setTimelineError(null);
          setTimeline([]);
          setV2Pts(0);
          setV3Pts(0);
          setSelectedSubject(id);
        }}
        onLoadPointToAstronaut={onLoadPointToAstronaut}
      />

      <NasaDecisionCard
        vitals={vitals}
        evaluation={evaluation}
        context={context}
        variant="cohort-only"
      />

      <details className="nasa-details">
        <summary><AresIcon name="activity" /> Resultados de la auditoría</summary>
        <p>{inventory.totalValidObservations.toLocaleString('es-MX')} observaciones · {inventory.datasets.length} estudios</p>
        <div className="nasa-audit-grid">
          <div><strong>{benchmark.v3EvaluableCount}/{benchmark.withQuantitativeVitals}</strong><span>registros con signos evaluados</span></div>
          <div><strong>{benchmark.tiltClassifiedAsOrthostaticNotRestPanic}/{benchmark.tiltWithHr100PlusTotal}</strong><span>lecturas con regla de inclinación</span></div>
          <div><strong>{benchmark.unknownGlucoseFlaggedContextualConfirmation}/{benchmark.unknownGlucose100to139Count}</strong><span>lecturas de glucosa con ayuno desconocido</span></div>
          <div><strong>{benchmark.missionVsClinicalConflictsV2} → {benchmark.missionVsClinicalConflictsV3}</strong><span>conflictos con ejercicio</span></div>
        </div>
      </details>

      <details className="nasa-details">
        <summary><AresIcon name="clipboard" /> Fuentes NASA ({inventory.datasets.length})</summary>
        <div className="nasa-source-list">
          {inventory.datasets.map((ds) => (
            <details key={ds.studyId} className="nasa-source">
              <summary><strong>{ds.officialId}</strong><span>{ds.validObservationsExtracted} observaciones</span></summary>
              <p>{ds.population}</p>
              <p>Variables: {ds.availableVitals.join(', ') || 'síntomas'}</p>
              {ds.knownDefectsAndNotes[0] ? <p>{ds.knownDefectsAndNotes[0]}</p> : null}
              <a href={ds.sourceUrl} target="_blank" rel="noreferrer">Ver fuente oficial <AresIcon name="arrow-right" size={16} /></a>
            </details>
          ))}
        </div>
      </details>
    </section>
  );
}
