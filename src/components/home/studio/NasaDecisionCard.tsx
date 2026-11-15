'use client';

import { useMemo, useState } from 'react';
import { AresIcon } from '@/components/ui/Icons';
import type { HealthEvaluation, PartialVitalValues } from '@/domain/health';
import { evaluateNasaOperationalDecision, type GravityStressMode, type NasaMissionTriageLevel } from '@/domain/nasa/cohort-decision';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import './nasa-panel.css';

interface NasaDecisionCardProps {
  vitals: PartialVitalValues;
  evaluation: HealthEvaluation;
  context?: Partial<ObservationContext>;
  onPingEarth?: () => void;
  onGoToControls?: () => void;
}

function getTriageBg(level: NasaMissionTriageLevel): string {
  switch (level) {
    case 'LEVEL_3_MISSION_ABORT_OR_RETURN': return 'var(--red-bg)';
    case 'LEVEL_2_EARTH_INTERVENTION': return 'var(--yellow-bg)';
    case 'LEVEL_1_ONBOARD_COUNTERMEASURE': return 'var(--lavender-soft)';
    case 'LEVEL_0_AUTONOMOUS_NOMINAL': return 'var(--green-bg)';
    default: return 'var(--surface-alt)';
  }
}

export function NasaDecisionCard({ vitals, evaluation, context, onPingEarth, onGoToControls }: NasaDecisionCardProps) {
  const [stressMode, setStressMode] = useState<GravityStressMode>('post_bedrest_median');
  const decision = useMemo(
    () => evaluateNasaOperationalDecision(vitals, evaluation, context, stressMode),
    [vitals, evaluation, context, stressMode]
  );
  const sim = decision.gravitySimulation;
  const hasVitals = evaluation.coverage.presentCount > 0;

  return (
    <section className="nasa-decision" id="nasaDecisionCard">
      <div className="group-head">
        <h3 className="card-title"><AresIcon name="activity" /> Comparación NASA</h3>
      </div>

      <div className="trace-box" style={{ background: getTriageBg(decision.triageLevel), padding: 16 }}>
        <strong>{hasVitals ? decision.title : 'Añade una medición'}</strong>
        {hasVitals ? (
          <>
            <div className="meta-pills-row" style={{ marginTop: 12 }}>
              <span className={`meta-pill ${decision.requiresEarthIntervention ? 'danger' : 'ok'}`}>
                Tierra {decision.requiresEarthIntervention ? 'requerida' : 'no requerida'}
              </span>
              <span className={`meta-pill ${decision.evaCleared ? 'ok' : 'warn'}`}>
                EVA {decision.evaCleared ? 'autorizada' : 'suspendida'}
              </span>
              <span className={`meta-pill ${decision.returnToGravityReady ? 'ok' : 'warn'}`}>
                Retorno {decision.returnToGravityReady ? 'apto' : 'con soporte'}
              </span>
            </div>
            {decision.requiresEarthIntervention && onPingEarth ? (
              <button type="button" className="btn-tactile" onClick={onPingEarth}>
                <AresIcon name="radio" /> Avisar a Tierra
              </button>
            ) : null}
            <details style={{ marginTop: 12 }}>
              <summary>Ver explicación</summary>
              <p>{decision.operationalVerdict}</p>
              <ul>{decision.recommendedActions.map((action) => <li key={action}>{action}</li>)}</ul>
              <p>{decision.symptomCohortBreakdown.matchingHistoricalTier}</p>
            </details>
          </>
        ) : onGoToControls ? (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn-tactile" onClick={onGoToControls}>
              <AresIcon name="sliders" /> Medir signos
            </button>
          </div>
        ) : null}
      </div>

      <div className="nasa-comparison">
        <h4>Tu medición en la cohorte</h4>
        {decision.cohortComparisons.length === 0 ? (
          <p>Sin mediciones para comparar.</p>
        ) : (
          <div className="nasa-grid-stats" style={{ marginTop: 10 }}>
            {decision.cohortComparisons.map((item) => (
              <div key={item.field} className="stat-box">
                <strong>{item.label} · {item.value} {item.unit}</strong>
                <div>Percentil {item.estimatedPercentile}</div>
                <details>
                  <summary>Referencia NASA</summary>
                  <p>Mediana {item.cohortMedian} · P10–P90 {item.cohortP10}–{item.cohortP90} {item.unit}</p>
                  <p>{item.studySource} · {item.sampleSize} muestras</p>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="trace-box" style={{ padding: 16 }}>
        <h4>Simular regreso a gravedad</h4>
        <p>{sim.verdictTitle}</p>
        <div className="chip-row" style={{ marginTop: 10, marginBottom: 10 }}>
          <button type="button" className={`chip-toggle${stressMode === 'post_bedrest_median' ? ' active' : ''}`} aria-pressed={stressMode === 'post_bedrest_median'} onClick={() => setStressMode('post_bedrest_median')}>
            Estándar
          </button>
          <button type="button" className={`chip-toggle${stressMode === 'post_bedrest_p25_vulnerable' ? ' active' : ''}`} aria-pressed={stressMode === 'post_bedrest_p25_vulnerable'} onClick={() => setStressMode('post_bedrest_p25_vulnerable')}>
            Desacondicionamiento
          </button>
        </div>
        {sim.projectedTiltHr !== null || sim.projectedTiltSbp !== null ? (
          <div className="meta-pills-row">
            <span className="meta-pill">Pulso {sim.currentHr ?? '—'} → {sim.projectedTiltHr ?? '—'} bpm</span>
            <span className="meta-pill">Presión {sim.currentSbp ?? '—'}/{sim.currentDbp ?? '—'} → {sim.projectedTiltSbp ?? '—'}/{sim.projectedTiltDbp ?? '—'} mmHg</span>
          </div>
        ) : null}
        <details>
          <summary>Ver explicación</summary>
          <p>{sim.verdictSummary}</p>
          <p>{sim.countermeasuresRequired[0]}</p>
          <p>Referencia NASA MR001G · Pulso P50 {sim.tiltCohortHrMedian}, P90 {sim.tiltCohortHrP90} bpm</p>
        </details>
      </div>
    </section>
  );
}
