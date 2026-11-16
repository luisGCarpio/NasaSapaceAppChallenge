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

function withMockWindowStorage(fn: (store: Map<string, string>) => void): void {
  const store = new Map<string, string>();
  const globalAny = globalThis as Record<string, unknown>;
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
  const prevWindow = globalAny.window;

  globalAny.window = {
    localStorage: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
  };

  try {
    fn(store);
  } finally {
    if (hadWindow) {
      globalAny.window = prevWindow;
    } else {
      delete globalAny.window;
    }
  }
}

test('local-state: recupera de JSON corrupto, deduplica saveLocalCheckin y ordena/limita logLocalComms', () => {
  const STORAGE_KEY = 'ares-pulse-local-v1';

  // 1) Recuperación sin crash cuando localStorage contiene JSON corrupto
  withMockWindowStorage((store) => {
    store.set(STORAGE_KEY, '{broken');
    const recovered = readLocalState();
    assert.equal(recovered.user.id, 'local');
    assert.equal(recovered.currentVitals, null);
    assert.equal(recovered.observations.length, 0);
    assert.equal(recovered.history.length, 0);
    assert.equal(recovered.commsLog.length, 0);
    assert.doesNotThrow(() => JSON.parse(store.get(STORAGE_KEY) ?? ''));
  });

  // 2) Deduplicación por clientSubmissionId en saveLocalCheckin
  withMockWindowStorage(() => {
    const first = saveLocalCheckin(
      { heart_rate: 74, bp_systolic: 118, bp_diastolic: 76 },
      { activityState: 'rest' },
      'local-sub-dedup-1'
    );
    assert.equal(first.deduplicated, false);
    assert.equal(first.state.observations.length, 1);

    const replay = saveLocalCheckin(
      { heart_rate: 74, bp_systolic: 118, bp_diastolic: 76 },
      { activityState: 'rest' },
      'local-sub-dedup-1'
    );
    assert.equal(replay.deduplicated, true);
    assert.equal(replay.state.observations.length, 1);
    assert.equal(readLocalState().observations.length, 1);
  });

  // 3) logLocalComms inserta el más reciente al índice 0 y respeta el tope de retención (40)
  withMockWindowStorage((store) => {
    const seeded = readLocalState();
    seeded.commsLog = Array.from({ length: 40 }, (_, i) => ({
      id: `old-${i}`,
      timestamp: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
      message: `Mensaje previo ${i}`,
      overallStatus: STATUS.GREEN,
      readinessScore: 90,
      copiedToClipboard: false,
    }));
    store.set(STORAGE_KEY, JSON.stringify(seeded));

    const logged = logLocalComms({
      message: 'Reporte más reciente',
      overallStatus: STATUS.RED,
      readinessScore: 38,
      copiedToClipboard: true,
    });

    assert.equal(logged.commsLog.length, 40);
    assert.equal(logged.commsLog[0].id, logged.entry.id);
    assert.equal(logged.commsLog[0].message, 'Reporte más reciente');
    assert.equal(logged.commsLog[1].id, 'old-39');
    assert.equal(logged.commsLog.some((item) => item.id === 'old-0'), false);
  });
});

test('local-state: createDemoLocalState y resetToDemoLocalState entregan 7 días reales, baseline y auto-seed en navegador', () => {
  const STORAGE_KEY = 'ares-pulse-local-v1';
  const demo = createDemoLocalState();

  assert.equal(demo.user.id, 'elena-demo');
  assert.equal(demo.user.name, 'Cmdr. Elena Vance');
  assert.equal(demo.user.email, 'elena@nasa.gov');
  assert.equal(demo.observations.length, 7);
  assert.equal(demo.history.length, 7);
  assert.equal(demo.evaluation.coverage.presentCount, 7);
  assert.equal(demo.evaluation.overallStatus, STATUS.GREEN);
  assert.ok((demo.evaluation.baselines.heart_rate?.n ?? 0) >= 3);
  assert.equal(demo.gamification.streak, 6);
  assert.equal(demo.gamification.missions.find((m) => m.id === 'hydrate')?.completed, true);
  assert.equal(demo.gamification.missions.filter((m) => m.completed).length, 1);
  assert.equal(demo.commsLog.length, 1);
  assert.ok(demo.observations.some((o) => o.overallStatus === STATUS.YELLOW));

  // Con window.document (entorno navegador), readLocalState inicializa demo si está vacío o tenía visita vacía previa
  withMockWindowStorage((store) => {
    const win = (globalThis as Record<string, unknown>).window as Record<string, unknown>;
    win.document = {};

    const firstVisit = readLocalState();
    assert.equal(firstVisit.observations.length, 7);
    assert.equal(firstVisit.user.name, 'Cmdr. Elena Vance');
    assert.ok(store.has(STORAGE_KEY));

    // Visita previa vacía (sin email y sin observaciones) se actualiza a demo
    store.set(
      STORAGE_KEY,
      JSON.stringify({
        user: { id: 'local', username: 'local', email: '', name: 'Tripulante', role: 'Bitácora personal' },
        currentVitals: null,
        observations: [],
        history: [],
      })
    );
    const upgraded = readLocalState();
    assert.equal(upgraded.observations.length, 7);
    assert.equal(upgraded.user.email, 'elena@nasa.gov');

    // Guardar una toma nueva la conserva, y resetToDemoLocalState restaura los 7 días
    saveLocalCheckin({ heart_rate: 122 }, { activityState: 'rest' }, 'custom-checkin-1');
    assert.equal(readLocalState().observations.length, 8);

    const restored = resetToDemoLocalState();
    assert.equal(restored.observations.length, 7);
    assert.equal(restored.evaluation.overallStatus, STATUS.GREEN);
  });
});

test('SSR AstroTabPanel muestra barra Modo Demo para el Jurado sin estado Cargando bitácora local', async () => {
  await withCssStub(async () => {
    const { AstroTabPanel } = await import('../src/components/home/studio/AstroTabPanel');
    const demo = createDemoLocalState();
    const html = renderToStaticMarkup(
      createElement(AstroTabPanel, {
        evaluation: demo.evaluation,
        vitals: demo.currentVitals ?? {},
        context: demo.currentContext ?? undefined,
        stressMode: 'post_bedrest_median',
        onStressModeChange: () => {},
        activeSimulation: null,
        activeNasaReplay: null,
        hasSavedHistory: true,
        onHighlightSystem: () => {},
        onClearReplayOrSim: () => {},
        onNavigateTab: () => {},
        onRunScenario: () => {},
        onResetDemo: () => {},
        onPingEarth: () => {},
      })
    );

    assert.equal(html.includes('Modo Demo para el Jurado'), true);
    assert.equal(html.includes('Día normal (Demo)'), true);
    assert.equal(html.includes('Simular fatiga'), true);
    assert.equal(html.includes('Simular alerta roja'), true);
    assert.equal(html.includes('Casos NASA'), true);
    assert.equal(html.includes('Cargando bitácora local'), false);
    assert.equal(html.includes('7/7 indicadores'), true);
  });
});

test('NasaDecisionCard muestra Referencia NASA y explicaciones mediante botones de modal y cohorte colapsable', async () => {
  const extensions = (Module as unknown as { _extensions: Record<string, (m: { exports: unknown }) => void> })._extensions;
  const prevCss = extensions['.css'];
  extensions['.css'] = (mod) => {
    const proxy = new Proxy({}, { get: (_, prop) => String(prop) });
    mod.exports = { __esModule: true, default: proxy };
  };
  try {
    const { NasaDecisionCard } = await import('../src/components/home/studio/NasaDecisionCard');
    const vitals = { heart_rate: 72, bp_systolic: 118, bp_diastolic: 76 };
    const html = renderToStaticMarkup(
      createElement(NasaDecisionCard, {
        vitals,
        evaluation: evaluateHealth(vitals),
        context: DEFAULT_CONTEXT,
      })
    );
    assert.equal((html.match(/<details class="nasa-details nasa-comparison">/g) ?? []).length, 1);
    assert.equal((html.match(/Referencia NASA/g) ?? []).length, 3);
    assert.equal((html.match(/Ver explicación/g) ?? []).length, 2);
  } finally {
    if (prevCss) extensions['.css'] = prevCss;
    else delete extensions['.css'];
  }
});

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

test('gravity-reentry-machine: open con GO_FOR_LANDING y reducedMotion=false pasa de descending a tablet tras 1800ms', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const phases: GravityModalPhase[] = [];
  const controller = createGravityDescentController({
    onPhaseChange: (phase) => phases.push(phase),
  });

  assert.equal(GRAVITY_DESCENT_DURATION_MS, 1800);
  assert.equal(controller.getPhase(), 'closed');
  assert.equal(controller.open('GO_FOR_LANDING', false), 'descending');
  assert.equal(controller.getPhase(), 'descending');
  assert.deepEqual(phases, ['descending']);

  t.mock.timers.tick(GRAVITY_DESCENT_DURATION_MS - 1);
  assert.equal(controller.getPhase(), 'descending');
  assert.deepEqual(phases, ['descending']);

  t.mock.timers.tick(1);
  assert.equal(controller.getPhase(), 'tablet');
  assert.deepEqual(phases, ['descending', 'tablet']);
});

test('gravity-reentry-machine: skip transiciona inmediatamente a tablet y cancela timer pendiente', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const phases: GravityModalPhase[] = [];
  const controller = createGravityDescentController({
    onPhaseChange: (phase) => phases.push(phase),
  });

  assert.equal(controller.open('GO_FOR_LANDING', false), 'descending');
  assert.equal(controller.skip(), 'tablet');
  assert.equal(controller.getPhase(), 'tablet');
  assert.deepEqual(phases, ['descending', 'tablet']);

  t.mock.timers.tick(GRAVITY_DESCENT_DURATION_MS + 1000);
  assert.equal(controller.getPhase(), 'tablet');
  assert.deepEqual(phases, ['descending', 'tablet']);

  let cleared = 0;
  const injected = createGravityDescentController<number>({
    setTimer: () => 42,
    clearTimer: () => {
      cleared += 1;
    },
  });
  assert.equal(injected.open('GO_FOR_LANDING', false), 'descending');
  assert.equal(injected.skip(), 'tablet');
  assert.equal(cleared, 1);
});

test('gravity-reentry-machine: open con reducedMotion=true o INSUFFICIENT_CARDIO_DATA va directo a tablet sin programar timer', () => {
  let scheduled = 0;

  const reducedCtrl = createGravityDescentController<number>({
    setTimer: () => {
      scheduled += 1;
      return scheduled;
    },
    clearTimer: () => {},
  });
  assert.equal(getInitialGravityOpenPhase('GO_FOR_LANDING', true), 'tablet');
  assert.equal(reducedCtrl.open('GO_FOR_LANDING', true), 'tablet');
  assert.equal(reducedCtrl.getPhase(), 'tablet');
  assert.equal(scheduled, 0);

  const insufficientCtrl = createGravityDescentController<number>({
    setTimer: () => {
      scheduled += 1;
      return scheduled;
    },
    clearTimer: () => {},
  });
  assert.equal(getInitialGravityOpenPhase('INSUFFICIENT_CARDIO_DATA', false), 'tablet');
  assert.equal(insufficientCtrl.open('INSUFFICIENT_CARDIO_DATA', false), 'tablet');
  assert.equal(insufficientCtrl.getPhase(), 'tablet');
  assert.equal(scheduled, 0);
});

test('gravity-reentry-machine: close y dispose durante descending cancelan timer pendiente sin mutaciones tardías', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const closePhases: GravityModalPhase[] = [];
  const closeCtrl = createGravityDescentController({
    onPhaseChange: (phase) => closePhases.push(phase),
  });
  assert.equal(closeCtrl.open('GO_FOR_LANDING', false), 'descending');
  assert.equal(closeCtrl.close(), 'closed');
  t.mock.timers.tick(GRAVITY_DESCENT_DURATION_MS + 1000);
  assert.equal(closeCtrl.getPhase(), 'closed');
  assert.deepEqual(closePhases, ['descending', 'closed']);

  const disposePhases: GravityModalPhase[] = [];
  const disposeCtrl = createGravityDescentController({
    onPhaseChange: (phase) => disposePhases.push(phase),
  });
  assert.equal(disposeCtrl.open('GO_FOR_LANDING', false), 'descending');
  disposeCtrl.dispose();
  t.mock.timers.tick(GRAVITY_DESCENT_DURATION_MS + 1000);
  assert.deepEqual(disposePhases, ['descending']);
  assert.equal(disposeCtrl.close(), 'closed');
  t.mock.timers.tick(GRAVITY_DESCENT_DURATION_MS + 1000);
  assert.equal(disposeCtrl.getPhase(), 'closed');
  assert.deepEqual(disposePhases, ['descending', 'closed']);
});

test('gravity-reentry-machine: replay reinicia a descending y cancela timer previo sin race conditions', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const phases: GravityModalPhase[] = [];
  const controller = createGravityDescentController({
    onPhaseChange: (phase) => phases.push(phase),
  });

  assert.equal(controller.open('GO_FOR_LANDING', false), 'descending');
  t.mock.timers.tick(1500);
  assert.equal(controller.getPhase(), 'descending');

  assert.equal(controller.replay('GO_FOR_LANDING', false), 'descending');
  t.mock.timers.tick(600);
  assert.equal(controller.getPhase(), 'descending');

  t.mock.timers.tick(1400);
  assert.equal(controller.getPhase(), 'tablet');

  assert.equal(controller.replay('COUNTERMEASURE_REQUIRED_BEFORE_LANDING', false), 'descending');
  assert.equal(controller.getPhase(), 'descending');
  t.mock.timers.tick(GRAVITY_DESCENT_DURATION_MS);
  assert.equal(controller.getPhase(), 'tablet');
  assert.deepEqual(phases, ['descending', 'tablet', 'descending', 'tablet']);
});

test('gravity-reentry-machine: interpolateMetric maneja null/NaN/extremos y prefersReducedMotionSafe es seguro en SSR', () => {
  assert.equal(interpolateMetric(null, 120, 0.5), null);
  assert.equal(interpolateMetric(70, null, 0.5), null);
  assert.equal(interpolateMetric(Number.NaN, 120, 0.5), null);
  assert.equal(interpolateMetric(70, Number.POSITIVE_INFINITY, 0.5), null);

  assert.equal(interpolateMetric(70, 130, 0), 70);
  assert.equal(interpolateMetric(70, 130, 1), 130);
  assert.equal(interpolateMetric(70, 130, -0.5), 70);
  assert.equal(interpolateMetric(70, 130, 1.5), 130);
  assert.equal(interpolateMetric(70, 130, Number.NaN), 70);

  const mid = interpolateMetric(70, 130, 0.5);
  assert.ok(typeof mid === 'number' && Number.isFinite(mid) && mid > 70 && mid < 130);

  assert.equal(typeof window, 'undefined');
  assert.equal(prefersReducedMotionSafe(), false);
  assert.equal(withReducedMotionWindow(true, () => prefersReducedMotionSafe()), true);
  assert.equal(withReducedMotionWindow(false, () => prefersReducedMotionSafe()), false);
});

test('SSR NasaDecisionCard prioriza Simular regreso a gravedad y colapsa cohorte en <details>', async () => {
  await withCssStub(async () => {
    const { NasaDecisionCard } = await import('../src/components/home/studio/NasaDecisionCard');
    const vitals = { heart_rate: 72, bp_systolic: 118, bp_diastolic: 76 };
    const html = renderToStaticMarkup(
      createElement(NasaDecisionCard, {
        vitals,
        evaluation: evaluateHealth(vitals),
        context: DEFAULT_CONTEXT,
      })
    );

    assert.equal(html.includes('Iniciar simulacro'), true);
    assert.equal((html.match(/Referencia NASA/g) ?? []).length, 3);
    assert.equal((html.match(/Ver explicación/g) ?? []).length, 2);
    assert.equal((html.match(/<details /g) ?? []).length, 1);
    const gravityIdx = html.indexOf('Simular regreso a gravedad');
    const cohortIdx = html.indexOf('Tu medición en la cohorte');
    assert.ok(gravityIdx !== -1 && cohortIdx !== -1 && gravityIdx < cohortIdx);
  });
});

test('SSR NasaDecisionCard con variant="cohort-only" omite triage y Simular regreso a gravedad', async () => {
  await withCssStub(async () => {
    const { NasaDecisionCard } = await import('../src/components/home/studio/NasaDecisionCard');
    const vitals = { heart_rate: 72, bp_systolic: 118, bp_diastolic: 76 };
    const html = renderToStaticMarkup(
      createElement(NasaDecisionCard, {
        vitals,
        evaluation: evaluateHealth(vitals),
        context: DEFAULT_CONTEXT,
        variant: 'cohort-only',
      })
    );

    assert.equal(html.includes('nasa-comparison-standalone'), true);
    assert.equal(html.includes('Tu medición en la cohorte'), true);
    assert.equal((html.match(/Referencia NASA/g) ?? []).length, 3);
    assert.equal(html.includes('nasa-triage-card'), false);
    assert.equal(html.includes('Simular regreso a gravedad'), false);
    assert.equal(html.includes('Iniciar simulacro'), false);
  });
});

