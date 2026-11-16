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
