'use client';

import type { ActiveNasaReplay, ActiveSimulation } from '@/context/AresContext';
import type { HealthEvaluation, PartialVitalValues, SystemId } from '@/domain/health';
import { AstroStageCard } from './AstroStageCard';
import { bgForLevel, statusToLevel, type TabKey } from './studio-types';

interface AstroTabPanelProps {
  evaluation: HealthEvaluation;
  vitals: PartialVitalValues;
  activeSimulation: ActiveSimulation | null;
  activeNasaReplay: ActiveNasaReplay | null;
  hasSavedHistory: boolean;
  onHighlightSystem: (sys: SystemId) => void;
  onClearReplayOrSim: () => void;
  onNavigateTab: (tab: TabKey) => void;
  onActionMission: (missionId: 'hydrate' | 'exercise' | 'rest') => void;
  onOpenBreather: () => void;
  onPingEarth: () => void;
}

export function AstroTabPanel({
  evaluation,
  vitals,
  activeSimulation,
  activeNasaReplay,
  hasSavedHistory,
  onHighlightSystem,
  onClearReplayOrSim,
  onNavigateTab,
  onActionMission,
  onOpenBreather,
  onPingEarth,
}: AstroTabPanelProps) {
  const overallLvl = statusToLevel(evaluation.overallStatus);
  const restrictEx = evaluation.clinicalRestrictions.restrictStrenuousExercise;
  const activeBaselines = Object.entries(evaluation.baselines)
    .filter(([, b]) => b && b.n >= 3 && b.summaryText)
    .slice(0, 3);
  const refUrl =
    evaluation.crossConclusion.reference?.url ?? evaluation.systems.heart.reference.url;
  const refLabel =
    evaluation.crossConclusion.reference?.source ?? evaluation.systems.heart.reference.source;

  return (
    <section className="center-stack">
      {activeNasaReplay ? (
        <div className="nasa-banner">
          <span>
            🛰️ <strong>Caso Real NASA (solo lectura):</strong> {activeNasaReplay.subjectId} ·{' '}
            {activeNasaReplay.studyId} ({activeNasaReplay.relativeLabel}) — Cobertura{' '}
            {evaluation.coverage.presentCount}/7
          </span>
          <button type="button" className="btn-tactile" onClick={onClearReplayOrSim}>
            Volver a mis datos
          </button>
        </div>
      ) : activeSimulation ? (
        <div className="nasa-banner" style={{ background: 'var(--yellow-bg)' }}>
          <span>
            🧪 <strong>Simulación educativa:</strong> {activeSimulation.label} (no altera tu bitácora)
          </span>
          <button type="button" className="btn-tactile" onClick={onClearReplayOrSim}>
            Salir de simulación
          </button>
        </div>
      ) : !hasSavedHistory && evaluation.coverage.presentCount === 0 ? (
        <div className="nasa-banner">
          <span>
            📋 <strong>Bitácora limpia (0 inventados):</strong> mide uno o más indicadores o carga un sujeto real NASA.
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="btn-tactile" onClick={() => onNavigateTab('controls')}>
              🎛️ Controles
            </button>
            <button type="button" className="btn-tactile" onClick={() => onNavigateTab('nasa')}>
              🛰️ Ver 3,965 datos NASA
            </button>
          </div>
        </div>
      ) : null}

      <AstroStageCard
        evaluation={evaluation}
        vitals={vitals}
        onHighlightSystem={onHighlightSystem}
      />

      <div className="diagnosis-card" id="diagnosisCard" style={{ background: bgForLevel(overallLvl) }}>
        <span className="diagnosis-tag" id="diagTag">
          MOTOR v{evaluation.algorithmVersion} • COBERTURA {evaluation.coverage.presentCount}/7 ({evaluation.coverage.coveragePct}%)
        </span>
        <h2 className="diagnosis-title" id="diagTitle">{evaluation.crossConclusion.title}</h2>
        <p className="diagnosis-text" id="diagText">{evaluation.crossConclusion.message}</p>

        <div className="meta-pills-row">
          <span className={`meta-pill ${evaluation.quality.needsRecheck ? 'warn' : 'ok'}`}>
            Calidad: {evaluation.quality.label}
          </span>
          <span className="meta-pill soft">
            Índice orientativo: {evaluation.readinessScore !== null ? `${evaluation.readinessScore}/100` : 'N/D'}
          </span>
          {evaluation.quality.recheckWindow ? (
            <span className="meta-pill warn">⏱️ Reevaluar: {evaluation.quality.recheckWindow}</span>
          ) : null}
          {activeBaselines.map(([key, base]) => (
            <span key={key} className={`meta-pill ${base?.significantDrift ? 'warn' : ''}`}>
              📈 {base?.summaryText}
            </span>
          ))}
        </div>

        {restrictEx ? (
          <div className="trace-box" style={{ background: 'var(--red-bg)' }}>
            <strong>⚠️ Ejercicio intenso restringido por seguridad clínica:</strong>{' '}
            {evaluation.clinicalRestrictions.reasons.join(' ')}
          </div>
        ) : null}

        {evaluation.ruleTraces.length > 0 ? (
          <div className="trace-box">
            <strong>Reglas aplicadas:</strong>{' '}
            {evaluation.ruleTraces.map((t) => t.ruleId).join(' · ')} —{' '}
            <a href={refUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--periwinkle)', fontWeight: 800 }}>
              Fuente: {refLabel} ↗
            </a>
          </div>
        ) : null}

        <div className="actions-row" id="actionsRow">
          <button type="button" className="action-chip" onClick={() => onActionMission('hydrate')}>
            💧 Hidratarse ahora
          </button>
          <button
            type="button"
            className={`action-chip${restrictEx ? ' locked' : ''}`}
            disabled={restrictEx}
            onClick={() => onActionMission('exercise')}
          >
            {restrictEx ? '🔒 Ejercicio pausado por alerta' : '🏃 30 min ejercicio'}
          </button>
          <button type="button" className="action-chip" onClick={() => onActionMission('rest')}>
            😴 Descansar / Dormir
          </button>
          <button type="button" className="action-chip" onClick={onOpenBreather}>
            🧘 Pausa mental 10s
          </button>
          <button type="button" className="action-chip primary-alert" onClick={onPingEarth}>
            📡 Avisar a Tierra
          </button>
        </div>
      </div>
    </section>
  );
}
