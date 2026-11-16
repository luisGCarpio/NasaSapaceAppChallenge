import assert from 'node:assert/strict';
import Module from 'node:module';
import test from 'node:test';
import { createElement, isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContextAndSaveCard } from '../src/components/home/studio/ContextAndSaveCard';
import {
  GRAVITY_DESCENT_DURATION_MS,
  type GravityModalPhase,
  createGravityDescentController,
  getInitialGravityOpenPhase,
  interpolateMetric,
  prefersReducedMotionSafe,
} from '../src/components/home/studio/gravity-reentry-machine';
import { applyContextChange, applyNumericToDraft } from '../src/components/home/studio/studio-actions';
import {
  applySymptomChanges,
  createCleanDraft,
  draftToPartialVitals,
  setDraftKeysMeasured,
  setDraftMeasured,
} from '../src/components/home/studio/studio-types';
import { type PartialVitalValues, STATUS, VITAL_SPECS, evaluateHealth } from '../src/domain/health';
import { DEFAULT_CONTEXT } from '../src/domain/health/context-specs';
import {
  type GravityStressMode,
  evaluateNasaOperationalDecision,
} from '../src/domain/nasa/cohort-decision';
import {
  createDemoLocalState,
  logLocalComms,
  readLocalState,
  resetToDemoLocalState,
  saveLocalCheckin,
} from '../src/lib/local-state';

async function withCssStub<T>(fn: () => Promise<T>): Promise<T> {
  const extensions = (Module as unknown as { _extensions: Record<string, (m: { exports: unknown }) => void> })._extensions;
  const prevCss = extensions['.css'];
  extensions['.css'] = (mod) => {
    const proxy = new Proxy({}, { get: (_, prop) => String(prop) });
    mod.exports = { __esModule: true, default: proxy };
  };
  try {
    return await fn();
  } finally {
    if (prevCss) extensions['.css'] = prevCss;
    else delete extensions['.css'];
  }
}
function withReducedMotionWindow<T>(matches: boolean, fn: () => T): T {
  const globalAny = globalThis as Record<string, unknown>;
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
  const prevWindow = globalAny.window;

  globalAny.window = {
    matchMedia: () => ({ matches }),
  };

  try {
    return fn();
  } finally {
    if (hadWindow) {
      globalAny.window = prevWindow;
    } else {
      delete globalAny.window;
    }
  }
}

test('SSR GravityReentryModal cubre los 4 estados de LandingReadinessVerdict, accesibilidad y nota sistémica', async () => {
  await withCssStub(async () => {
    const { GravityReentryModal } = await import('../src/components/home/studio/GravityReentryModal');

    const renderModal = (
      vitals: PartialVitalValues,
      options: {
        stressMode?: GravityStressMode;
        context?: typeof DEFAULT_CONTEXT;
        open?: boolean;
        reducedMotion?: boolean;
        onPingEarth?: () => void;
        onGoToControls?: () => void;
      } = {}
    ) => {
      const stressMode = options.stressMode ?? 'post_bedrest_median';
      const context = options.context ?? DEFAULT_CONTEXT;
      const evaluation = evaluateHealth(vitals, { context });
      const decision = evaluateNasaOperationalDecision(vitals, evaluation, context, stressMode);

      const render = () =>
        renderToStaticMarkup(
          createElement(GravityReentryModal, {
            open: options.open ?? true,
            sim: decision.gravitySimulation,
            decision,
            stressMode,
            onChangeStressMode: () => {},
            onClose: () => {},
            onPingEarth: options.onPingEarth,
            onGoToControls: options.onGoToControls,
          })
        );

      const html =
        options.reducedMotion === undefined
          ? render()
          : withReducedMotionWindow(options.reducedMotion, render);

      return { html, decision, sim: decision.gravitySimulation };
    };

    const assertA11yDialog = (html: string) => {
      assert.equal(html.includes('role="dialog"'), true);
      assert.equal(html.includes('aria-modal="true"'), true);
      assert.equal(html.includes('aria-labelledby="gravity-modal-title"'), true);
      assert.equal(html.includes('id="gravity-modal-title"'), true);
    };

    // Modal cerrado no renderiza nada
    const closed = renderModal({ heart_rate: 65, bp_systolic: 115, bp_diastolic: 75 }, { open: false });
    assert.equal(closed.html, '');

    // Modal abierto en fase descending (SSR sin window) muestra la nave y botón Saltar accesible
    const descending = renderModal({ heart_rate: 65, bp_systolic: 115, bp_diastolic: 75 });
    assertA11yDialog(descending.html);
    assert.equal(descending.html.includes('gravity-rocket-svg'), true);
    assert.equal(descending.html.includes('Saltar'), true);

    // 1) GO_FOR_LANDING nominal (sin restricción sistémica)
    const goNominal = renderModal(
      { heart_rate: 65, bp_systolic: 115, bp_diastolic: 75 },
      { reducedMotion: true }
    );
    assert.equal(goNominal.sim.verdict, 'GO_FOR_LANDING');
    assert.equal(goNominal.decision.returnToGravityReady, true);
    assertA11yDialog(goNominal.html);
    assert.equal(goNominal.html.includes('Apto para aterrizar'), true);
    assert.equal(goNominal.html.includes('gravity-systemic-note'), false);

    // 1b) GO_FOR_LANDING con returnToGravityReady: false por fiebre / hipoglucemia
    const goWithFever = renderModal(
      { heart_rate: 65, bp_systolic: 115, bp_diastolic: 75, temperature: 38.5 },
      { reducedMotion: true }
    );
    assert.equal(goWithFever.sim.verdict, 'GO_FOR_LANDING');
    assert.equal(goWithFever.decision.returnToGravityReady, false);
    assert.equal(goWithFever.html.includes('gravity-systemic-note'), true);

    const goWithHypo = renderModal(
      { heart_rate: 65, bp_systolic: 115, bp_diastolic: 75, glucose: 50 },
      { reducedMotion: true }
    );
    assert.equal(goWithHypo.sim.verdict, 'GO_FOR_LANDING');
    assert.equal(goWithHypo.decision.returnToGravityReady, false);
    assert.equal(goWithHypo.html.includes('gravity-systemic-note'), true);

    // 2) COUNTERMEASURE_REQUIRED_BEFORE_LANDING (+60/+2/0 y +69/-16/-15)
    const cmMedian = renderModal(
      { heart_rate: 76, bp_systolic: 118, bp_diastolic: 76 },
      { stressMode: 'post_bedrest_median', reducedMotion: true }
    );
    assert.equal(cmMedian.sim.verdict, 'COUNTERMEASURE_REQUIRED_BEFORE_LANDING');
    assertA11yDialog(cmMedian.html);
    assert.equal(cmMedian.html.includes('Necesitas prepararte'), true);
    assert.equal(cmMedian.html.includes('+60 bpm al pararse'), true);
    assert.equal(cmMedian.html.includes('+2 / 0 mmHg'), true);

    const cmVulnerable = renderModal(
      { heart_rate: 68, bp_systolic: 115, bp_diastolic: 75 },
      { stressMode: 'post_bedrest_p25_vulnerable', reducedMotion: true }
    );
    assert.equal(cmVulnerable.sim.verdict, 'COUNTERMEASURE_REQUIRED_BEFORE_LANDING');
    assert.equal(cmVulnerable.html.includes('+69 bpm al pararse'), true);
    assert.equal(cmVulnerable.html.includes('-16 / -15 mmHg'), true);

    // 3) PRESYNCOPE_ABORT_RISK (acciones sencillas y botón Avisar a Tierra si onPingEarth está presente)
    const presyncopeWithPing = renderModal(
      { heart_rate: 92, bp_systolic: 108, bp_diastolic: 74 },
      { reducedMotion: true, onPingEarth: () => {} }
    );
    assert.equal(presyncopeWithPing.sim.verdict, 'PRESYNCOPE_ABORT_RISK');
    assertA11yDialog(presyncopeWithPing.html);
    assert.equal(presyncopeWithPing.html.includes('Riesgo de mareo o desmayo'), true);
    assert.equal(presyncopeWithPing.html.includes('Avisar a Tierra'), true);

    const presyncopeNoPing = renderModal(
      { heart_rate: 92, bp_systolic: 108, bp_diastolic: 74 },
      { reducedMotion: true }
    );
    assert.equal(presyncopeNoPing.html.includes('Avisar a Tierra'), false);

    // 4) INSUFFICIENT_CARDIO_DATA (solo bp_diastolic, sin NaN ni 0 bpm, con Medir signos)
    const insufficientDbpOnly = renderModal(
      { bp_diastolic: 74 },
      { onGoToControls: () => {} }
    );
    assert.equal(insufficientDbpOnly.sim.verdict, 'INSUFFICIENT_CARDIO_DATA');
    assertA11yDialog(insufficientDbpOnly.html);
    assert.equal(insufficientDbpOnly.html.includes('Faltan datos'), true);
    assert.equal(insufficientDbpOnly.html.includes('—/— mmHg'), true);
    assert.equal(insufficientDbpOnly.html.includes('>—<'), true);
    assert.equal(insufficientDbpOnly.html.includes('NaN'), false);
    assert.equal(insufficientDbpOnly.html.includes('0 bpm'), false);
    assert.equal(insufficientDbpOnly.html.includes('Medir signos'), true);

    const insufficientNoAction = renderModal({});
    assert.equal(insufficientNoAction.sim.verdict, 'INSUFFICIENT_CARDIO_DATA');
    assert.equal(insufficientNoAction.html.includes('Medir signos'), false);
  });
});

test('SSR GravityReentryModal maneja alreadyTilted y telemetría parcial (solo heart_rate sin PA)', async () => {
  await withCssStub(async () => {
    const { GravityReentryModal } = await import('../src/components/home/studio/GravityReentryModal');

    // Caso alreadyTilted (orthostatic_tilt / standing_tilt)
    const tiltedContext = {
      ...DEFAULT_CONTEXT,
      activityState: 'orthostatic_tilt' as const,
      posture: 'standing_tilt' as const,
    };
    const tiltedVitals = { heart_rate: 90, bp_systolic: 112, bp_diastolic: 74 };
    const tiltedEval = evaluateHealth(tiltedVitals, { context: tiltedContext });
    const tiltedDecision = evaluateNasaOperationalDecision(tiltedVitals, tiltedEval, tiltedContext);

    const tiltedHtml = withReducedMotionWindow(true, () =>
      renderToStaticMarkup(
        createElement(GravityReentryModal, {
          open: true,
          sim: tiltedDecision.gravitySimulation,
          decision: tiltedDecision,
          stressMode: 'post_bedrest_median',
          onChangeStressMode: () => {},
          onClose: () => {},
        })
      )
    );
    assert.equal(tiltedDecision.gravitySimulation.appliedDeltaHr, 0);
    assert.equal(tiltedDecision.gravitySimulation.appliedDeltaSbp, 0);
    assert.equal(tiltedDecision.gravitySimulation.appliedDeltaDbp, 0);
    assert.equal(tiltedHtml.includes('Sin cambio (ya estás de pie)'), true);

    // Caso parcial: solo heart_rate sin PA
    const hrOnlyVitals = { heart_rate: 72 };
    const hrOnlyEval = evaluateHealth(hrOnlyVitals, { context: DEFAULT_CONTEXT });
    const hrOnlyDecision = evaluateNasaOperationalDecision(hrOnlyVitals, hrOnlyEval, DEFAULT_CONTEXT);

    const hrOnlyDescendingHtml = renderToStaticMarkup(
      createElement(GravityReentryModal, {
        open: true,
        sim: hrOnlyDecision.gravitySimulation,
        decision: hrOnlyDecision,
        stressMode: 'post_bedrest_median',
        onChangeStressMode: () => {},
        onClose: () => {},
      })
    );
    assert.equal(hrOnlyDescendingHtml.includes('NaN'), false);
    assert.equal(hrOnlyDescendingHtml.includes('gravity-rocket-svg'), true);

    const hrOnlyTabletHtml = withReducedMotionWindow(true, () =>
      renderToStaticMarkup(
        createElement(GravityReentryModal, {
          open: true,
          sim: hrOnlyDecision.gravitySimulation,
          decision: hrOnlyDecision,
          stressMode: 'post_bedrest_median',
          onChangeStressMode: () => {},
          onClose: () => {},
        })
      )
    );
    assert.equal(hrOnlyTabletHtml.includes('NaN'), false);
    assert.equal(hrOnlyTabletHtml.includes('72 → 132 bpm'), true);
    assert.equal(hrOnlyTabletHtml.includes('—/— mmHg'), true);
    assert.equal(hrOnlyTabletHtml.includes('Sin lectura de presión'), true);
    assert.equal(
      hrOnlyTabletHtml.includes('<span class="gravity-metric-delta">+2 / 0 mmHg</span>'),
      false
    );

    // En modo reduced-motion se oculta Repetir porque no hay animación que repetir
    assert.equal(hrOnlyTabletHtml.includes('Repetir'), false);

    // Caso orthostatic_tilt sentado (no standing_tilt): no debe decir "ya estás de pie"
    const seatedTiltContext = {
      ...DEFAULT_CONTEXT,
      activityState: 'orthostatic_tilt' as const,
      posture: 'seated' as const,
    };
    const seatedTiltEval = evaluateHealth(tiltedVitals, { context: seatedTiltContext });
    const seatedTiltDecision = evaluateNasaOperationalDecision(tiltedVitals, seatedTiltEval, seatedTiltContext);
    const seatedTiltHtml = withReducedMotionWindow(true, () =>
      renderToStaticMarkup(
        createElement(GravityReentryModal, {
          open: true,
          sim: seatedTiltDecision.gravitySimulation,
          decision: seatedTiltDecision,
          stressMode: 'post_bedrest_median',
          onChangeStressMode: () => {},
          onClose: () => {},
        })
      )
    );
    assert.equal(seatedTiltHtml.includes('Sin cambio (ya en prueba ortostática)'), true);
    assert.equal(seatedTiltHtml.includes('ya estás de pie'), false);
  });
});
