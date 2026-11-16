'use client';

import type { ActiveNasaReplay, ActiveSimulation } from '@/context/AresContext';
import type { HealthEvaluation, PartialVitalValues, ScenarioId, SystemId } from '@/domain/health';
import type { GravityStressMode } from '@/domain/nasa/cohort-decision';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import { AresIcon } from '@/components/ui/Icons';
import { AstroStageCard } from './AstroStageCard';
import { NasaDecisionCard } from './NasaDecisionCard';
import { bgForLevel, statusToLevel, type TabKey } from './studio-types';

interface AstroTabPanelProps {
  evaluation: HealthEvaluation;
  vitals: PartialVitalValues;
  context?: Partial<ObservationContext>;
  stressMode: GravityStressMode;
  onStressModeChange: (mode: GravityStressMode) => void;
  activeSimulation: ActiveSimulation | null;
  activeNasaReplay: ActiveNasaReplay | null;
  hasSavedHistory?: boolean;
  onHighlightSystem: (sys: SystemId) => void;
  onClearReplayOrSim: () => void;
  onNavigateTab: (tab: TabKey) => void;
  onRunScenario?: (id: ScenarioId) => void;
  onResetDemo?: () => void;
  onActionMission?: (missionId: 'hydrate' | 'exercise' | 'rest') => void;
  onOpenBreather?: () => void;
  onPingEarth: () => void;
}

export function AstroTabPanel({
  evaluation,
  vitals,
  context,
  stressMode,
  onStressModeChange,
  activeSimulation,
  activeNasaReplay,
  onHighlightSystem,
  onClearReplayOrSim,
  onNavigateTab,
  onRunScenario,
  onResetDemo,
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
      {!activeNasaReplay ? (
        <div className="demo-quick-bar" role="region" aria-label="Escenarios rápidos de demostración">
          <div className="demo-quick-copy">
            <strong>Modo Demo para el Jurado</strong>
            <span>Prueba escenarios clínicos y datos NASA reales sin cargar nada</span>
          </div>
          <div className="demo-quick-actions">
            <button
              type="button"
              className={`btn-tactile${!activeSimulation && overallLvl === 0 ? ' active-green' : ''}`}
              aria-pressed={!activeSimulation && overallLvl === 0}
              onClick={() => {
                if (activeSimulation) {
                  onClearReplayOrSim();
                } else {
                  onResetDemo?.();
                }
              }}
            >
              Día normal (Demo)
            </button>
            <button
              type="button"
              className={`btn-tactile${activeSimulation?.id === 'warning' ? ' active-yellow' : ''}`}
              aria-pressed={activeSimulation?.id === 'warning'}
              onClick={() => onRunScenario?.('warning')}
            >
              Simular fatiga
            </button>
            <button
              type="button"
              className={`btn-tactile${activeSimulation?.id === 'critical' ? ' active-red' : ''}`}
              aria-pressed={activeSimulation?.id === 'critical'}
              onClick={() => onRunScenario?.('critical')}
            >
              Simular alerta roja
            </button>
            <button
              type="button"
              className="btn-tactile"
              onClick={() => onNavigateTab('nasa')}
            >
              Casos NASA
            </button>
          </div>
        </div>
      ) : null}

      {activeNasaReplay ? (
        <div className="nasa-banner">
          <span>
            <strong>NASA · solo lectura</strong>  {activeNasaReplay.subjectId} ·{' '}
            {activeNasaReplay.studyId} ({activeNasaReplay.relativeLabel})
          </span>
          <button type="button" className="btn-tactile" onClick={onClearReplayOrSim}>
            Volver a mis datos
          </button>
        </div>
      ) : activeSimulation ? (
        <div className="nasa-banner" style={{ background: 'var(--yellow-bg)' }}>
          <span>
            <strong>Simulación:</strong> {activeSimulation.label} (no altera tu bitácora)
          </span>
          <button type="button" className="btn-tactile" onClick={onClearReplayOrSim}>
            Salir de simulación
          </button>
        </div>
      ) : null}

      <AstroStageCard
        evaluation={evaluation}
        vitals={vitals}
        onHighlightSystem={onHighlightSystem}
      />

      <div className="astro-right-col">
        <div className="diagnosis-card" id="diagnosisCard" style={{ background: bgForLevel(overallLvl) }}>
          <span className="diagnosis-tag" id="diagTag">
            {evaluation.coverage.presentCount}/7 indicadores
            {evaluation.readinessScore !== null ? ` · Índice ${evaluation.readinessScore}/100` : ''}
          </span>
          <h2 className="diagnosis-title" id="diagTitle">{evaluation.crossConclusion.title}</h2>

          {restrictEx ? (
            <div className="trace-box" style={{ background: 'var(--red-bg)' }}>
              <strong>Ejercicio intenso restringido:</strong>{' '}
              {evaluation.clinicalRestrictions.reasons.join(' ')}
            </div>
          ) : null}

          <details className="trace-box diagnosis-details">
            <summary>
              <span>Ver detalles</span>
              <span className="details-cue">Abrir</span>
            </summary>
            <p id="diagText">{evaluation.crossConclusion.message}</p>
            <div className="meta-pills-row">
              <span className={`meta-pill ${evaluation.quality.needsRecheck ? 'warn' : 'ok'}`}>
                Calidad: {evaluation.quality.label}
              </span>
              {evaluation.quality.recheckWindow ? (
                <span className="meta-pill warn">Reevaluar: {evaluation.quality.recheckWindow}</span>
              ) : null}
              {activeBaselines.map(([key, base]) => (
                <span key={key} className={`meta-pill ${base?.significantDrift ? 'warn' : ''}`}>
                  {base?.summaryText}
                </span>
              ))}
            </div>
            {evaluation.ruleTraces.length > 0 ? (
              <p><a href={refUrl} target="_blank" rel="noreferrer">{refLabel}</a></p>
            ) : null}
          </details>
        </div>

        <div className="astro-missions-strip" id="actionsRow">
          <div className="astro-missions-copy">
            <strong>
              {evaluation.coverage.presentCount === 0
                ? 'Sin lectura activa'
                : restrictEx || overallLvl === 2 || overallLvl === 1
                  ? 'Acción recomendada'
                  : 'Misiones'}
            </strong>
          </div>
          {evaluation.coverage.presentCount === 0 ? (
            <button type="button" className="action-chip primary-alert" onClick={() => onNavigateTab('controls')}>
              <AresIcon name="sliders" /> Medir signos
            </button>
          ) : restrictEx || overallLvl === 2 || overallLvl === 1 ? (
            <div className="astro-strip-buttons">
              <button type="button" className="action-chip primary-alert" onClick={onPingEarth}>
                <AresIcon name="radio" /> Avisar a Tierra
              </button>
              <button type="button" className="action-chip" onClick={() => onNavigateTab('missions')}>
                <AresIcon name="activity" /> Misiones
              </button>
            </div>
          ) : overallLvl === 0 ? (
            <button type="button" className="action-chip" onClick={() => onNavigateTab('missions')}>
              <AresIcon name="activity" /> Ver misiones
            </button>
          ) : (
            <button type="button" className="action-chip primary-alert" onClick={() => onNavigateTab('controls')}>
              <AresIcon name="sliders" /> Medir signos
            </button>
          )}
        </div>
      </div>

      {evaluation.coverage.presentCount > 0 ? (
        <NasaDecisionCard
          vitals={vitals}
          evaluation={evaluation}
          context={context}
          variant="compact"
          stressMode={stressMode}
          onStressModeChange={onStressModeChange}
          onPingEarth={onPingEarth}
          onGoToControls={() => onNavigateTab('controls')}
        />
      ) : null}
    </section>
  );
}
