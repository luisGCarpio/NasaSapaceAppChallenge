'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AresIcon } from '@/components/ui/Icons';
import type { HealthEvaluation, PartialVitalValues } from '@/domain/health';
import {
  evaluateNasaOperationalDecision,
  type GravityStressMode,
  type NasaMissionTriageLevel,
  type NasaVitalCohortComparison,
} from '@/domain/nasa/cohort-decision';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import { GravityReentryModal } from './GravityReentryModal';
import './nasa-panel.css';

interface NasaDecisionCardProps {
  vitals: PartialVitalValues;
  evaluation: HealthEvaluation;
  context?: Partial<ObservationContext>;
  variant?: 'full' | 'cohort-only' | 'compact';
  stressMode?: GravityStressMode;
  onStressModeChange?: (mode: GravityStressMode) => void;
  onPingEarth?: () => void;
  onGoToControls?: () => void;
}

type ActiveInfoModal =
  | { kind: 'cohort'; field: NasaVitalCohortComparison['field'] }
  | { kind: 'triage' }
  | { kind: 'gravity' }
  | null;

function getZoneMeta(zone: NasaVitalCohortComparison['zone']): { label: string; pillClass: string } {
  switch (zone) {
    case 'extreme_outlier':
      return { label: 'Extremo (<P5 o >P95)', pillClass: 'danger' };
    case 'watch_tail':
      return { label: 'Zona de vigilancia', pillClass: 'warn' };
    default:
      return { label: 'Banda nominal P10–P90', pillClass: 'ok' };
  }
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

function trapTabInside(container: HTMLElement | null, event: KeyboardEvent) {
  if (!container) return;
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => el.getAttribute('aria-hidden') !== 'true');
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (!container.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  }
}

export function NasaDecisionCard({
  vitals,
  evaluation,
  context,
  variant = 'full',
  stressMode,
  onStressModeChange,
  onPingEarth,
  onGoToControls,
}: NasaDecisionCardProps) {
  const isCompact = variant === 'compact';
  const showTriageAndGravity = variant === 'full';
  const [localStressMode, setLocalStressMode] = useState<GravityStressMode>('post_bedrest_median');
  const activeStressMode = stressMode ?? localStressMode;
  const setStressMode = (nextMode: GravityStressMode) => {
    setLocalStressMode(nextMode);
    onStressModeChange?.(nextMode);
  };

  const [activeModal, setActiveModal] = useState<ActiveInfoModal>(null);
  const [gravityModalOpen, setGravityModalOpen] = useState(false);
  const infoModalRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const gravityTriggerRef = useRef<HTMLElement | null>(null);
  const pointerDownOnBackdropRef = useRef(false);

  const decision = useMemo(
    () => evaluateNasaOperationalDecision(vitals, evaluation, context, activeStressMode),
    [vitals, evaluation, context, activeStressMode]
  );
  const sim = decision.gravitySimulation;
  const hasVitals = evaluation.coverage.presentCount > 0;
  const alreadyTilted =
    (sim.appliedDeltaHr === 0 && sim.appliedDeltaSbp === 0 && sim.appliedDeltaDbp === 0) ||
    sim.baselinePosture.startsWith('standing_tilt');
  const scenarioHelper =
    sim.verdict === 'INSUFFICIENT_CARDIO_DATA'
      ? 'Mide pulso o presión para comparar los escenarios Estándar y Caso severo.'
      : alreadyTilted
        ? sim.baselinePosture.startsWith('standing_tilt')
          ? 'Ya estás de pie: se usan tus signos actuales sin cambio extra en ningún escenario.'
          : 'Ya estás en prueba ortostática: se usan tus signos actuales sin cambio extra.'
        : activeStressMode === 'post_bedrest_median'
          ? 'Estándar: suma +60 bpm al pulso y +2 / 0 mmHg a la presión al pararse.'
          : 'Caso severo: suma +69 bpm al pulso y cae la presión -16 / -15 mmHg al pararse.';

  const cohortModalItem =
    activeModal?.kind === 'cohort'
      ? decision.cohortComparisons.find((item) => item.field === activeModal.field) ?? null
      : null;

  const isModalOpen =
    !isCompact &&
    activeModal !== null &&
    (activeModal.kind !== 'cohort' || cohortModalItem !== null);

  function openModal(next: Exclude<ActiveInfoModal, null>, triggerEl: HTMLElement) {
    returnFocusRef.current = triggerEl;
    setActiveModal(next);
  }

  function closeModal() {
    pointerDownOnBackdropRef.current = false;
    setActiveModal(null);
    const trigger = returnFocusRef.current;
    returnFocusRef.current = null;
    if (trigger?.isConnected) {
      requestAnimationFrame(() => {
        if (trigger.isConnected) {
          trigger.focus();
        }
      });
    }
  }

  function openGravitySimulator(triggerEl: HTMLElement) {
    gravityTriggerRef.current = triggerEl;
    setGravityModalOpen(true);
  }

  function closeGravitySimulator() {
    setGravityModalOpen(false);
    const trigger = gravityTriggerRef.current;
    gravityTriggerRef.current = null;
    if (trigger?.isConnected) {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          if (trigger.isConnected) {
            trigger.focus();
          }
        });
      } else {
        trigger.focus();
      }
    }
  }

  useEffect(() => {
    if (!isModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key === 'Tab') {
        trapTabInside(infoModalRef.current, event);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isModalOpen]);

  const cohortDetails = (
    <details
      className={`nasa-details ${
        showTriageAndGravity || isCompact ? 'nasa-comparison' : 'nasa-comparison-standalone'
      }`}
    >
      <summary>
        <AresIcon name="activity" /> Tu medición en la cohorte
        {decision.cohortComparisons.length > 0 ? ` (${decision.cohortComparisons.length})` : ''}
      </summary>
      {decision.cohortComparisons.length === 0 ? (
        <p>Sin mediciones para comparar.</p>
      ) : (
        <div className="nasa-grid-stats">
          {decision.cohortComparisons.map((item) => (
            <div key={item.field} className="stat-box">
              <strong>{item.label} · {item.value} {item.unit}</strong>
              <div>Percentil {item.estimatedPercentile}</div>
              {isCompact ? (
                <details>
                  <summary>Referencia NASA</summary>
                  <p>
                    Mediana {item.cohortMedian} {item.unit} · P10–P90: {item.cohortP10}–{item.cohortP90}{' '}
                    {item.unit} ({item.studySource}, {item.sampleSize} muestras)
                  </p>
                  <p>{item.summaryText}</p>
                </details>
              ) : (
                <button
                  type="button"
                  className="nasa-modal-trigger"
                  onClick={(e) => openModal({ kind: 'cohort', field: item.field }, e.currentTarget)}
                >
                  <AresIcon name="info" size={15} /> Referencia NASA
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </details>
  );

  const infoModal = isModalOpen ? (
    <div
      className="nasa-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nasa-info-modal-title"
      onPointerDown={(event) => {
        pointerDownOnBackdropRef.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        const startedOnBackdrop = pointerDownOnBackdropRef.current;
        pointerDownOnBackdropRef.current = false;
        if (startedOnBackdrop && event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <div className="nasa-modal" ref={infoModalRef}>
        <div className="nasa-modal-header">
          <h2
            id="nasa-info-modal-title"
            style={{ fontSize: '1.15rem', lineHeight: 1.25, margin: 0 }}
          >
            {activeModal?.kind === 'cohort' && cohortModalItem
              ? `${cohortModalItem.label} · Referencia NASA`
              : activeModal?.kind === 'triage'
                ? 'Explicación del dictamen NASA'
                : 'Simulador de regreso a gravedad'}
          </h2>
          <button
            type="button"
            className="nasa-modal-close"
            aria-label="Cerrar"
            onClick={closeModal}
          >
            <AresIcon name="close" size={18} />
          </button>
        </div>

        {activeModal?.kind === 'cohort' && cohortModalItem ? (
          <div className="nasa-modal-body">
            <div className="meta-pills-row">
              <span className="meta-pill soft">
                Tu medición: {cohortModalItem.value} {cohortModalItem.unit}
              </span>
              <span className="meta-pill">Percentil {cohortModalItem.estimatedPercentile}</span>
              <span className={`meta-pill ${getZoneMeta(cohortModalItem.zone).pillClass}`}>
                {getZoneMeta(cohortModalItem.zone).label}
              </span>
            </div>
            <div className="nasa-modal-stats">
              <div>
                <span>Mediana (P50)</span>
                <strong>{cohortModalItem.cohortMedian} {cohortModalItem.unit}</strong>
              </div>
              <div>
                <span>Rango nominal (P10–P90)</span>
                <strong>{cohortModalItem.cohortP10}–{cohortModalItem.cohortP90} {cohortModalItem.unit}</strong>
              </div>
              <div>
                <span>Estudio y muestra</span>
                <strong>{cohortModalItem.studySource} · {cohortModalItem.sampleSize} muestras</strong>
              </div>
            </div>
            <p>{cohortModalItem.summaryText}</p>
          </div>
        ) : activeModal?.kind === 'triage' ? (
          <div className="nasa-modal-body">
            <div className="meta-pills-row">
              <span className="meta-pill soft">{decision.badgeText}</span>
            </div>
            <p>{decision.operationalVerdict}</p>
            {decision.recommendedActions.length > 0 ? (
              <ul>
                {decision.recommendedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            ) : null}
            <p className="nasa-modal-muted">{decision.symptomCohortBreakdown.matchingHistoricalTier}</p>
          </div>
        ) : (
          <div className="nasa-modal-body">
            <p><strong>{sim.verdictTitle}</strong></p>
            <p>{sim.verdictSummary}</p>
            {sim.countermeasuresRequired.length > 0 ? (
              <ul>
                {sim.countermeasuresRequired.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            <p className="nasa-modal-muted">
              Referencia {sim.referenceStudy} · Pulso P50 {sim.tiltCohortHrMedian}, P90 {sim.tiltCohortHrP90} bpm
            </p>
          </div>
        )}

        <div className="nasa-modal-footer">
          <button ref={closeBtnRef} type="button" className="btn-tactile" onClick={closeModal}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (variant === 'cohort-only') {
    return (
      <>
        {cohortDetails}
        {infoModal}
      </>
    );
  }

  if (isCompact) {
    return (
      <section className="nasa-decision is-compact" id="nasaDecisionCard">
        <div className="trace-box nasa-compact-card">
          <div className="nasa-compact-top">
            <div className="nasa-compact-header">
              <h3>{hasVitals ? decision.title : 'Añade una medición'}</h3>
              {hasVitals ? (
                <p className="nasa-compact-status">
                  EVA {decision.evaCleared ? 'autorizada' : 'suspendida'} · Retorno{' '}
                  {decision.returnToGravityReady ? 'apto' : 'con soporte'}
                </p>
              ) : null}
            </div>

            {hasVitals ? (
              <button
                type="button"
                className="btn-tactile nasa-sim-launch"
                onClick={(e) => openGravitySimulator(e.currentTarget)}
              >
                <AresIcon name="activity" size={16} /> Simular regreso a gravedad
              </button>
            ) : onGoToControls ? (
              <button type="button" className="btn-tactile" onClick={onGoToControls}>
                <AresIcon name="sliders" /> Medir signos
              </button>
            ) : null}
          </div>

          {hasVitals ? (
            <details className="nasa-compact-clinical">
              <summary>
                <span>Detalle clínico</span>
                <span className="details-cue">Abrir</span>
              </summary>
              <p>{decision.operationalVerdict}</p>
              {decision.recommendedActions.length > 0 ? (
                <ul>
                  {decision.recommendedActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              ) : null}
              <p className="nasa-modal-muted">
                {decision.symptomCohortBreakdown.matchingHistoricalTier} · Referencia {sim.referenceStudy}
              </p>
            </details>
          ) : null}
        </div>

        {cohortDetails}

        <GravityReentryModal
          open={gravityModalOpen}
          sim={sim}
          decision={decision}
          stressMode={activeStressMode}
          onChangeStressMode={setStressMode}
          onClose={closeGravitySimulator}
          onPingEarth={onPingEarth}
          onGoToControls={onGoToControls}
        />
      </section>
    );
  }

  return (
    <section className="nasa-decision" id="nasaDecisionCard">
      <div className="trace-box nasa-triage-card" style={{ background: getTriageBg(decision.triageLevel) }}>
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
            <div className="nasa-actions-inline">
              {decision.requiresEarthIntervention && onPingEarth ? (
                <button type="button" className="btn-tactile" onClick={onPingEarth}>
                  <AresIcon name="radio" /> Avisar a Tierra
                </button>
              ) : null}
              <button
                type="button"
                className="nasa-modal-trigger"
                onClick={(e) => openModal({ kind: 'triage' }, e.currentTarget)}
              >
                <AresIcon name="info" size={15} /> Ver explicación
              </button>
            </div>
          </>
        ) : onGoToControls ? (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn-tactile" onClick={onGoToControls}>
              <AresIcon name="sliders" /> Medir signos
            </button>
          </div>
        ) : null}
      </div>

      <div className="trace-box nasa-gravity-card">
        <div className="nasa-gravity-header">
          <h3 style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0, fontSize: '1.08rem' }}>
            <AresIcon name="activity" /> Simular regreso a gravedad
          </h3>
          <span className="meta-pill soft">Simulador 1G</span>
        </div>
        <p>{sim.verdictTitle}</p>
        <div className="nasa-gravity-toolbar">
          <div className="chip-row" role="group" aria-label="Escenario de simulación">
            <button
              type="button"
              className={`chip-toggle${activeStressMode === 'post_bedrest_median' ? ' active' : ''}`}
              aria-pressed={activeStressMode === 'post_bedrest_median'}
              onClick={() => setStressMode('post_bedrest_median')}
            >
              Estándar
            </button>
            <button
              type="button"
              className={`chip-toggle${activeStressMode === 'post_bedrest_p25_vulnerable' ? ' active' : ''}`}
              aria-pressed={activeStressMode === 'post_bedrest_p25_vulnerable'}
              onClick={() => setStressMode('post_bedrest_p25_vulnerable')}
            >
              Caso severo
            </button>
          </div>
          <div className="nasa-actions-inline">
            <button
              type="button"
              className="btn-tactile nasa-sim-launch"
              onClick={(e) => openGravitySimulator(e.currentTarget)}
            >
              <AresIcon name="activity" size={16} /> Iniciar simulacro
            </button>
            <button
              type="button"
              className="nasa-modal-trigger"
              onClick={(e) => openModal({ kind: 'gravity' }, e.currentTarget)}
            >
              <AresIcon name="info" size={15} /> Ver explicación
            </button>
          </div>
        </div>
        <p className="nasa-modal-muted">{scenarioHelper}</p>
        {sim.projectedTiltHr !== null || sim.projectedTiltSbp !== null ? (
          <div className="meta-pills-row">
            {sim.projectedTiltHr !== null ? (
              <span className="meta-pill">Pulso {sim.currentHr} → {sim.projectedTiltHr} bpm</span>
            ) : null}
            {sim.projectedTiltSbp !== null && sim.projectedTiltDbp !== null ? (
              <span className="meta-pill">
                Presión {sim.currentSbp}/{sim.currentDbp} → {sim.projectedTiltSbp}/{sim.projectedTiltDbp} mmHg
              </span>
            ) : sim.projectedTiltSbp !== null ? (
              <span className="meta-pill">
                Presión sistólica {sim.currentSbp} → {sim.projectedTiltSbp} mmHg
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {cohortDetails}

      {infoModal}

      <GravityReentryModal
        open={gravityModalOpen}
        sim={sim}
        decision={decision}
        stressMode={activeStressMode}
        onChangeStressMode={setStressMode}
        onClose={closeGravitySimulator}
        onPingEarth={onPingEarth}
        onGoToControls={onGoToControls}
      />
    </section>
  );
}
