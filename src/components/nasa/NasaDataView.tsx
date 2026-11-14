'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAres } from '@/context/AresContext';
import type { BenchmarkMetrics } from '@/domain/nasa/benchmark-runner';
import type { NasaAuditInventory } from '@/domain/nasa/nasa-types';
import { apiGetNasaCatalog, apiGetNasaSubjectTimeline } from '@/lib/client-api';
import type {
  NasaSubjectSummary,
  NasaSubjectTimelineResult,
} from '@/server/repositories/nasa-datasets-repo';
import { SectionCard } from '../ui/SectionCard';
import { StatusBadge } from '../ui/StatusBadge';

export function NasaDataView() {
  const router = useRouter();
  const { activateNasaReplay } = useAres();
  const [inventory, setInventory] = useState<NasaAuditInventory | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkMetrics | null>(null);
  const [subjects, setSubjects] = useState<NasaSubjectSummary[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('C3-6043');
  const [timeline, setTimeline] = useState<NasaSubjectTimelineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    apiGetNasaCatalog()
      .then((res) => {
        if (!mounted) return;
        setInventory(res.inventory);
        setBenchmark(res.benchmark);
        setSubjects(res.subjects);
        const preferred =
          res.subjects.find((s) => s.subjectId === 'C3-6043')?.subjectId ??
          res.subjects[0]?.subjectId ??
          '';
        setSelectedSubject(preferred);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Error cargando catálogo NASA.');
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    let mounted = true;
    apiGetNasaSubjectTimeline(selectedSubject)
      .then((res) => {
        if (mounted) setTimeline(res);
      })
      .catch(() => {
        if (mounted) setTimeline(null);
      });
    return () => {
      mounted = false;
    };
  }, [selectedSubject]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#1E2E4E] bg-[#0B1220] p-6 text-xs text-slate-300">
        Cargando inventario real NASA OSDR y NLSP...
      </div>
    );
  }

  if (error || !inventory || !benchmark) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-6 text-xs text-red-200">
        {error ?? 'No se pudo cargar el inventario NASA.'}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="Validación Retrospectiva con Datos Reales NASA"
        subtitle={`Motor v${benchmark.engineVersion} evaluado sobre ${benchmark.totalObservationsEvaluated.toLocaleString()} registros reales de NASA OSDR y NLSP`}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3">
            <p className="text-[11px] text-slate-400">Cobertura v2.0 (estricta 7/7)</p>
            <p className="mt-1 font-mono text-xl font-bold text-red-300 tabular-nums">
              {benchmark.v2CoverageRatePct}% ({benchmark.v2EvaluableCount})
            </p>
          </div>
          <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3">
            <p className="text-[11px] text-slate-400">Cobertura v3.0 (parcial real)</p>
            <p className="mt-1 font-mono text-xl font-bold text-emerald-300 tabular-nums">
              {benchmark.v3CoverageRatePct}% ({benchmark.v3EvaluableCount})
            </p>
          </div>
          <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3">
            <p className="text-[11px] text-slate-400">Tilt FC&gt;100 contextualizado</p>
            <p className="mt-1 font-mono text-xl font-bold text-sky-300 tabular-nums">
              {benchmark.tiltClassifiedAsOrthostaticNotRestPanic}/{benchmark.tiltWithHr100PlusTotal}
            </p>
          </div>
          <div className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3">
            <p className="text-[11px] text-slate-400">Conflictos ejercicio vs alerta</p>
            <p className="mt-1 font-mono text-xl font-bold text-emerald-300 tabular-nums">
              {benchmark.missionVsClinicalConflictsV3} (v2: {benchmark.missionVsClinicalConflictsV2})
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Explorador Longitudinal por Participante Real (Solo Lectura)"
        subtitle="Selecciona un sujeto anónimo para auditar su línea base personal (mediana/IQR) y reproducir una toma en Inicio"
        action={
          <select
            aria-label="Seleccionar sujeto NASA"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3 py-1.5 text-xs text-slate-100"
          >
            {subjects.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>
                {s.subjectId} · {s.cohortGroup} ({s.vitalsCount} tomas)
              </option>
            ))}
          </select>
        }
      >
        {timeline ? (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {[...timeline.points]
              .sort((a, b) => (b.evaluation.overallStatus === 'RED' ? 1 : 0) - (a.evaluation.overallStatus === 'RED' ? 1 : 0))
              .slice(0, 30)
              .map(({ observation, evaluation }) => (
                <div
                  key={observation.observationId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1E2E4E] bg-[#060A12] px-3.5 py-2.5 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={evaluation.overallStatus} compact />
                      <span className="font-mono font-semibold text-slate-100">
                        {observation.relativeLabel}
                      </span>
                      <span className="text-slate-400">({observation.studyId})</span>
                    </div>
                    <p className="text-slate-300">{evaluation.crossConclusion.title}</p>
                    <p className="font-mono text-[11px] text-slate-400">
                      {[
                        observation.vitals.heart_rate != null ? `FC ${observation.vitals.heart_rate}` : null,
                        observation.vitals.bp_systolic != null
                          ? `PA ${observation.vitals.bp_systolic}/${observation.vitals.bp_diastolic}`
                          : null,
                        observation.vitals.temperature != null ? `Temp ${observation.vitals.temperature}°C` : null,
                        observation.vitals.glucose != null ? `Gluc ${observation.vitals.glucose}mg/dL` : null,
                        observation.vitals.sleep_hours != null ? `Sueño ${observation.vitals.sleep_hours}h` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      activateNasaReplay({
                        subjectId: observation.subjectId,
                        studyId: observation.studyId,
                        cohortGroup: observation.cohortGroup,
                        relativeLabel: observation.relativeLabel,
                        vitals: observation.vitals,
                        evaluation,
                      });
                      router.push('/');
                    }}
                    className="rounded-lg bg-[#0B3D91] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#105BD8]"
                  >
                    Auditar en Inicio
                  </button>
                </div>
              ))}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Inventario y Auditoría de Fuentes Oficiales"
        subtitle={`${inventory.totalFilesProcessed} archivos descargados y verificados con SHA-256 · Política: ${inventory.policy}`}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {inventory.datasets.map((d) => (
            <div key={d.studyId} className="rounded-xl border border-[#1E2E4E] bg-[#060A12] p-3.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-sky-300">{d.studyId}</span>
                <span className="rounded-full border border-[#1E2E4E] px-2 py-0.5 text-[10px] text-slate-300">
                  {d.sourceSystem}
                </span>
              </div>
              <p className="mt-1 font-semibold text-slate-100">{d.title}</p>
              <p className="mt-1 text-slate-400">
                {d.validObservationsExtracted} observaciones / {d.uniqueSubjects} sujetos ({d.filesProcessed} archivos)
              </p>
              <p className="mt-1.5 text-[11px] text-amber-200/90">
                Auditoría: {d.knownDefectsAndNotes[0]}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
