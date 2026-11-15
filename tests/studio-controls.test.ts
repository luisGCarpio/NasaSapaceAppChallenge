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
import { logLocalComms, readLocalState, saveLocalCheckin } from '../src/lib/local-state';

test('síntomas existentes permanecen visibles y se pueden quitar sin cambiar su literal', () => {
  let edited: string[] = [];
  const tree = ContextAndSaveCard({
    context: { ...DEFAULT_CONTEXT, symptoms: ['Fatiga severa', 'Síntoma previo'] },
    userState: null, saving: false, saveMessage: null, canSaveCount: 0, isSimulationOrReplay: false,
    onChangeContext: (key, value) => { if (key === 'symptoms') edited = value as string[]; },
    onSaveCheckin: () => {},
  });
  const buttons: Array<{ children?: ReactNode; 'aria-pressed'?: boolean; onClick?: () => void }> = [];
  function visit(node: ReactNode): void {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!isValidElement<{ children?: ReactNode; 'aria-pressed'?: boolean; onClick?: () => void }>(node)) return;
    if (node.type === 'button') buttons.push(node.props);
    visit(node.props.children);
  }
  visit(tree);
  const previous = buttons.find((button) => button.children === 'Síntoma previo');
  assert.equal(previous?.['aria-pressed'], true);
  assert.equal(buttons.find((button) => button.children === 'Fatiga severa')?.['aria-pressed'], true);
  previous?.onClick?.();
  assert.deepEqual(edited, ['Fatiga severa']);
});

test('editar un caso aplica solo el cambio a los síntomas personales', () => {
  assert.deepEqual(applySymptomChanges(['Cefalea'], ['Fatiga severa'], ['Fatiga severa', 'Mareo']), ['Cefalea', 'Mareo']);
  assert.deepEqual(applySymptomChanges(['Cefalea', 'Fatiga severa'], ['Fatiga severa'], []), ['Cefalea']);
});

test('quitar una medición simulada no activa valores de relleno personales', () => {
  const personal = createCleanDraft();
  assert.deepEqual(draftToPartialVitals(setDraftMeasured(personal, 'heart_rate', false)), {});
});

test('setDraftKeysMeasured activa y desactiva ambos indicadores de una card', () => {
  const draft = createCleanDraft();
  const measured = setDraftKeysMeasured(draft, ['sleep_hours', 'mood'], true);
  assert.equal(measured.measured.sleep_hours, true);
  assert.equal(measured.measured.mood, true);
  assert.equal(measured.measured.heart_rate, false);
  const cleared = setDraftKeysMeasured(measured, ['sleep_hours', 'mood'], false);
  assert.equal(cleared.measured.sleep_hours, false);
  assert.equal(cleared.measured.mood, false);
});

test('cada card muestra un solo botón Medido/Sin medir en la cabecera y sin dot-status', async () => {
  const extensions = (Module as unknown as { _extensions: Record<string, (m: { exports: unknown }) => void> })._extensions;
  const prevCss = extensions['.css'];
  extensions['.css'] = (mod) => {
    const proxy = new Proxy({}, { get: (_, prop) => String(prop) });
    mod.exports = { __esModule: true, default: proxy };
  };
  try {
    const { ControlsTabPanel } = await import('../src/components/home/studio/ControlsTabPanel');
    const draft = setDraftKeysMeasured(createCleanDraft(), ['sleep_hours', 'mood'], true);
    const tree = ControlsTabPanel({
      draft,
      context: DEFAULT_CONTEXT,
      evaluation: evaluateHealth(draftToPartialVitals(draft)),
      highlightedSys: null,
      onInteract: () => {},
      userState: null,
      saving: false,
      saveMessage: null,
      isSimulationOrReplay: false,
      onUpdateNumeric: () => {},
      onUpdateMood: () => {},
      onToggleSystemMeasured: () => {},
      onChangeContext: () => {},
      onRunScenario: () => {},
      onClearAllMeasured: () => {},
      onSaveCheckin: () => {},
    });
    const html = renderToStaticMarkup(tree);
    assert.equal(html.includes('dot-status'), false);
    assert.equal((html.match(/class="measure-toggle/g) ?? []).length, 3);
    assert.equal((html.match(/>Medido</g) ?? []).length, 1);
    assert.equal((html.match(/>Sin medir</g) ?? []).length, 2);
  } finally {
    if (prevCss) extensions['.css'] = prevCss;
    else delete extensions['.css'];
  }
});

test('ControlsTabPanel y ContextAndSaveCard aplican disclosures, stepper táctil, a11y y banner de simulación', async () => {
  const extensions = (Module as unknown as { _extensions: Record<string, (m: { exports: unknown }) => void> })._extensions;
  const prevCss = extensions['.css'];
  extensions['.css'] = (mod) => {
    const proxy = new Proxy({}, { get: (_, prop) => String(prop) });
    mod.exports = { __esModule: true, default: proxy };
  };
  try {
    const { ControlsTabPanel } = await import('../src/components/home/studio/ControlsTabPanel');
    const cleanDraft = createCleanDraft();
    const baseProps = {
      draft: cleanDraft,
      context: { ...DEFAULT_CONTEXT, symptoms: ['Cefalea'] },
      evaluation: evaluateHealth(draftToPartialVitals(cleanDraft)),
      highlightedSys: null,
      onInteract: () => {},
      userState: null,
      saving: false,
      saveMessage: { ok: true, text: 'Guardado ok' },
      isSimulationOrReplay: false,
      onUpdateNumeric: () => {},
      onUpdateMood: () => {},
      onToggleSystemMeasured: () => {},
      onChangeContext: () => {},
      onRunScenario: () => {},
      onClearAllMeasured: () => {},
      onSaveCheckin: () => {},
    };

    const idleTree = ControlsTabPanel(baseProps);
    assert.equal(
      (idleTree as unknown as { props: { onPointerDownCapture?: unknown } }).props.onPointerDownCapture,
      undefined
    );
    const idleHtml = renderToStaticMarkup(idleTree);

    // Wave 1: Sin dato removido, #val-mood removido, simulaciones y contexto colapsados por defecto
    assert.equal(idleHtml.includes('Sin dato'), false);
    assert.equal(idleHtml.includes('id="val-mood"'), false);
    assert.equal(idleHtml.includes('class="val-pill is-empty"'), true);
    assert.equal(idleHtml.includes('<details class="sim-disclosure">'), true);
    assert.equal(idleHtml.includes('<details class="context-disclosure">'), true);
    assert.ok(idleHtml.indexOf('id="group-context"') < idleHtml.indexOf('class="sim-disclosure"'));
    assert.equal(idleHtml.includes('/7 medidos'), false);
    assert.equal(idleHtml.includes('1 activo'), false);
    // saveMessage.ok === true no se duplica inline (lo maneja .toast)
    assert.equal(idleHtml.includes('Guardado ok'), false);

    // Wave 2: Semántica h2, labels asociados, fieldset dual-bp, sin botones +/- y aria-valuetext
    assert.equal((idleHtml.match(/<h2 class="group-head-left">/g) ?? []).length, 4);
    assert.equal(idleHtml.includes('<fieldset class="dual-bp"'), true);
    assert.equal(idleHtml.includes('<legend class="sr-only">Presión arterial</legend>'), true);
    assert.equal(idleHtml.includes('for="in-sleep"'), true);
    assert.equal(idleHtml.includes('for="ctx-activity"'), true);
    assert.equal(idleHtml.includes('class="stepper-btn"'), false);
    assert.equal(idleHtml.includes('Disminuir Horas de sueño'), false);
    assert.equal(idleHtml.includes('Aumentar Temperatura corporal'), false);
    assert.equal(idleHtml.includes('aria-valuetext="8.0 h"'), true);
    assert.equal(idleHtml.includes('touch-action:pan-y'), true);

    // Simulación activa + error inline + highlightedSys
    const simTree = ControlsTabPanel({
      ...baseProps,
      highlightedSys: 'heart',
      isSimulationOrReplay: true,
      saveMessage: { ok: false, text: 'Error al guardar toma' },
    });
    assert.equal(
      typeof (simTree as unknown as { props: { onPointerDownCapture?: unknown } }).props.onPointerDownCapture,
      'function'
    );
    const simHtml = renderToStaticMarkup(simTree);
    assert.equal(simHtml.includes('Modo simulación activo — datos de prueba, no tu registro real'), true);
    assert.equal(simHtml.includes('Volver a mis datos'), true);
    assert.equal(simHtml.includes('role="alert"'), true);
    assert.equal(simHtml.includes('Error al guardar toma'), true);
  } finally {
    if (prevCss) extensions['.css'] = prevCss;
    else delete extensions['.css'];
  }
});

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

test('applyNumericToDraft respeta límites VITAL_SPECS y mantiene bp_systolic >= bp_diastolic + 10 al cruzar sliders', () => {
  const initial = createCleanDraft(); // bp_systolic: 115, bp_diastolic: 75

  const assertBpInvariants = (draft: ReturnType<typeof createCleanDraft>) => {
    assert.ok(draft.bp_systolic >= VITAL_SPECS.bp_systolic.min && draft.bp_systolic <= VITAL_SPECS.bp_systolic.max);
    assert.ok(draft.bp_diastolic >= VITAL_SPECS.bp_diastolic.min && draft.bp_diastolic <= VITAL_SPECS.bp_diastolic.max);
    assert.ok(draft.bp_systolic >= draft.bp_diastolic + 10);
    assert.equal(draft.measured.bp, true);
  };

  // Bajar sistólica por debajo de diastólica + 10 empuja diastólica hacia abajo
  const loweredSbp = applyNumericToDraft(initial, 'bp_systolic', 70);
  assert.equal(loweredSbp.bp_systolic, 70);
  assert.equal(loweredSbp.bp_diastolic, 60);
  assertBpInvariants(loweredSbp);

  // Intentar exceder el mínimo de sistólica (55 mmHg) ajusta sistólica al piso y mantiene diferencial >= 10
  const belowMinSbp = applyNumericToDraft(initial, 'bp_systolic', 40);
  assert.equal(belowMinSbp.bp_systolic, VITAL_SPECS.bp_systolic.min); // 55
  assert.equal(belowMinSbp.bp_diastolic, 45);
  assertBpInvariants(belowMinSbp);

  // Intentar exceder el máximo de sistólica (250 mmHg)
  const aboveMaxSbp = applyNumericToDraft(initial, 'bp_systolic', 300);
  assert.equal(aboveMaxSbp.bp_systolic, VITAL_SPECS.bp_systolic.max); // 250
  assert.equal(aboveMaxSbp.bp_diastolic, 75);
  assertBpInvariants(aboveMaxSbp);

  // Subir diastólica por encima de sistólica - 10 empuja sistólica hacia arriba
  const raisedDbp = applyNumericToDraft(initial, 'bp_diastolic', 120);
  assert.equal(raisedDbp.bp_diastolic, 120);
  assert.equal(raisedDbp.bp_systolic, 130);
  assertBpInvariants(raisedDbp);

  // Intentar exceder el mínimo de diastólica (30 mmHg)
  const belowMinDbp = applyNumericToDraft(initial, 'bp_diastolic', 15);
  assert.equal(belowMinDbp.bp_diastolic, VITAL_SPECS.bp_diastolic.min); // 30
  assert.equal(belowMinDbp.bp_systolic, 115);
  assertBpInvariants(belowMinDbp);

  // Intentar exceder el máximo de diastólica (150 mmHg) ajusta diastólica a 150 y sistólica a 160
  const aboveMaxDbp = applyNumericToDraft(initial, 'bp_diastolic', 195);
  assert.equal(aboveMaxDbp.bp_diastolic, VITAL_SPECS.bp_diastolic.max); // 150
  assert.equal(aboveMaxDbp.bp_systolic, 160);
  assertBpInvariants(aboveMaxDbp);
});

test('applyContextChange aplica solo delta de síntomas en modo simulación/NASA y no contamina contexto personal', () => {
  const personal = {
    ...DEFAULT_CONTEXT,
    activityState: 'rest' as const,
    posture: 'seated' as const,
    glucoseTiming: 'fasting' as const,
    symptoms: ['Cefalea', 'Fatiga severa'],
  };
  const displayed = {
    ...DEFAULT_CONTEXT,
    activityState: 'orthostatic_tilt' as const,
    posture: 'standing_tilt' as const,
    glucoseTiming: 'post_meal' as const,
    symptoms: ['Fatiga severa', 'Mareo ortostático'],
  };

  // 1) inMode === true y key === 'symptoms': agregar síntoma aplica solo el delta sobre personal
  const addedInMode = applyContextChange(
    personal,
    displayed,
    true,
    'symptoms',
    ['Fatiga severa', 'Mareo ortostático', 'Náusea']
  );
  assert.deepEqual(addedInMode.symptoms, ['Cefalea', 'Fatiga severa', 'Náusea']);
  assert.equal(addedInMode.activityState, 'rest');
  assert.equal(addedInMode.posture, 'seated');
  assert.equal(addedInMode.glucoseTiming, 'fasting');

  // 2) inMode === true y key === 'symptoms': quitar síntoma compartido quita solo ese síntoma en personal
  const removedInMode = applyContextChange(
    personal,
    displayed,
    true,
    'symptoms',
    ['Mareo ortostático']
  );
  assert.deepEqual(removedInMode.symptoms, ['Cefalea']);

  // 3) inMode === true y otra clave (activityState): actualiza solo esa clave en personal sin contaminar síntomas ni postura
  const changedActivityInMode = applyContextChange(
    personal,
    displayed,
    true,
    'activityState',
    'eva'
  );
  assert.equal(changedActivityInMode.activityState, 'eva');
  assert.equal(changedActivityInMode.posture, 'seated');
  assert.equal(changedActivityInMode.glucoseTiming, 'fasting');
  assert.deepEqual(changedActivityInMode.symptoms, ['Cefalea', 'Fatiga severa']);
  assert.notEqual(changedActivityInMode.symptoms, personal.symptoms);

  // 4) inMode === false: actualiza directamente sobre personal
  const directSymptoms = applyContextChange(
    personal,
    displayed,
    false,
    'symptoms',
    ['Palpitaciones']
  );
  assert.deepEqual(directSymptoms.symptoms, ['Palpitaciones']);
  assert.equal(directSymptoms.activityState, 'rest');

  const directPosture = applyContextChange(
    personal,
    displayed,
    false,
    'posture',
    'supine'
  );
  assert.equal(directPosture.posture, 'supine');
  assert.deepEqual(directPosture.symptoms, ['Cefalea', 'Fatiga severa']);
});

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
