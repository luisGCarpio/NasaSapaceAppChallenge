import assert from 'node:assert/strict';
import Module from 'node:module';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BREATH_SCENE_DURATION_MS,
  MISSION_SCENE_DURATION_MS,
  type MissionActionId,
  type MissionSceneModalPhase,
  createMissionSceneController,
  getBreathPhaseLabel,
  getInitialMissionModalPhase,
  getMissionSceneCopy,
  getMissionSceneDurationMs,
  shouldOpenMissionModal,
} from '../src/components/home/studio/mission-scene-machine';
import {
  ALGORITHM_VERSION,
  evaluateHealth,
  type HealthEvaluation,
  SCENARIOS_META,
  STATUS,
  VITAL_SPECS,
} from '../src/domain/health';
import { createDefaultMissions, createInitialGamification } from '../src/domain/missions/mission-catalog';
import type { PublicUserState } from '../src/server/storage/types';

const ALL_ACTIONS: readonly MissionActionId[] = ['hydrate', 'exercise', 'rest', 'breathe', 'comms'];
const STANDARD_ACTIONS: readonly MissionActionId[] = ['hydrate', 'exercise', 'rest', 'comms'];
const FORBIDDEN_GAMIFICATION_RE = /\bxp\b|nv\.|nivel/i;

function assertNoForbiddenGamificationCopy(html: string): void {
  assert.equal(html.includes('XP'), false);
  assert.equal(html.includes('Nv.'), false);
  const withoutClassAttrs = html.replace(/\sclass="[^"]*"/g, '');
  assert.equal(FORBIDDEN_GAMIFICATION_RE.test(withoutClassAttrs), false);
}

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

function createSampleUserState(evaluation: HealthEvaluation): PublicUserState {
  return {
    user: {
      id: 'local',
      username: 'commander',
      email: 'commander@ares.local',
      name: 'Comandante',
      role: 'astronaut',
    },
    currentVitals: { heart_rate: 72, bp_systolic: 118, bp_diastolic: 76 },
    currentContext: null,
    history: [],
    observations: [],
    gamification: createInitialGamification(),
    storageMode: 'local_json_atomic',
    syncMeta: {
      status: 'local_only',
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastHttpStatus: null,
      lastError: null,
      pendingCount: 0,
    },
    commsLog: [
      {
        id: 'comms-1',
        timestamp: '2026-11-15T10:15:00.000Z',
        overallStatus: STATUS.GREEN,
        readinessScore: 91,
        message: 'Estado nominal en órbita',
        copiedToClipboard: true,
      },
    ],
    lastCheckinAt: null,
    evaluation,
    algorithmVersion: ALGORITHM_VERSION,
    vitalSpecs: VITAL_SPECS,
    scenarios: SCENARIOS_META,
  };
}

test('mission-scene-machine: getMissionSceneDurationMs devuelve 1800ms para acciones estándar y 4500ms para breathe', () => {
  assert.equal(MISSION_SCENE_DURATION_MS, 1800);
  assert.equal(BREATH_SCENE_DURATION_MS, 4500);

  for (const actionId of STANDARD_ACTIONS) {
    assert.equal(getMissionSceneDurationMs(actionId), 1800);
  }
  assert.equal(getMissionSceneDurationMs('breathe'), 4500);
});

test('mission-scene-machine: open normal sin reducedMotion inicia en animating y pasa a tablet tras 1800ms o 4500ms', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  for (const actionId of STANDARD_ACTIONS) {
    const phases: MissionSceneModalPhase[] = [];
    const controller = createMissionSceneController({
      onPhaseChange: (phase) => phases.push(phase),
    });

    assert.equal(controller.getPhase(), 'closed');
    assert.equal(controller.open(actionId, 'normal', false), 'animating');
    assert.equal(controller.getPhase(), 'animating');
    assert.deepEqual(phases, ['animating']);

    t.mock.timers.tick(1799);
    assert.equal(controller.getPhase(), 'animating');
    assert.deepEqual(phases, ['animating']);

    t.mock.timers.tick(1);
    assert.equal(controller.getPhase(), 'tablet');
    assert.deepEqual(phases, ['animating', 'tablet']);
  }

  const breathePhases: MissionSceneModalPhase[] = [];
  const breatheCtrl = createMissionSceneController({
    onPhaseChange: (phase) => breathePhases.push(phase),
  });
  assert.equal(breatheCtrl.open('breathe', 'normal', false), 'animating');
  t.mock.timers.tick(4499);
  assert.equal(breatheCtrl.getPhase(), 'animating');
  t.mock.timers.tick(1);
  assert.equal(breatheCtrl.getPhase(), 'tablet');
  assert.deepEqual(breathePhases, ['animating', 'tablet']);
});

test('mission-scene-machine: skip transiciona de inmediato a tablet y cancela timer pendiente', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const phases: MissionSceneModalPhase[] = [];
  const controller = createMissionSceneController({
    onPhaseChange: (phase) => phases.push(phase),
  });

  assert.equal(controller.skip(), 'closed');
  assert.equal(controller.open('hydrate', 'normal', false), 'animating');
  assert.equal(controller.skip(), 'tablet');
  assert.equal(controller.getPhase(), 'tablet');
  assert.deepEqual(phases, ['animating', 'tablet']);

  t.mock.timers.tick(5000);
  assert.equal(controller.getPhase(), 'tablet');
  assert.deepEqual(phases, ['animating', 'tablet']);

  let cleared = 0;
  const injected = createMissionSceneController<number>({
    setTimer: () => 99,
    clearTimer: () => {
      cleared += 1;
    },
  });
  assert.equal(injected.open('breathe', 'normal', false), 'animating');
  assert.equal(injected.skip(), 'tablet');
  assert.equal(cleared, 1);
});

test('mission-scene-machine: open blocked o reducedMotion=true van directo a tablet sin programar timer', () => {
  let scheduled = 0;

  const blockedCtrl = createMissionSceneController<number>({
    setTimer: () => {
      scheduled += 1;
      return scheduled;
    },
    clearTimer: () => {},
  });
  assert.equal(getInitialMissionModalPhase('blocked', false), 'tablet');
  assert.equal(blockedCtrl.open('exercise', 'blocked', false), 'tablet');
  assert.equal(blockedCtrl.getPhase(), 'tablet');
  assert.equal(scheduled, 0);

  const reducedCtrl = createMissionSceneController<number>({
    setTimer: () => {
      scheduled += 1;
      return scheduled;
    },
    clearTimer: () => {},
  });
  assert.equal(getInitialMissionModalPhase('normal', true), 'tablet');
  assert.equal(reducedCtrl.open('breathe', 'normal', true), 'tablet');
  assert.equal(reducedCtrl.getPhase(), 'tablet');
  assert.equal(scheduled, 0);
});

test('mission-scene-machine: close y dispose cancelan timers limpiamente sin mutaciones tardías', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });

  const closePhases: MissionSceneModalPhase[] = [];
  const closeCtrl = createMissionSceneController({
    onPhaseChange: (phase) => closePhases.push(phase),
  });
  assert.equal(closeCtrl.open('rest', 'normal', false), 'animating');
  assert.equal(closeCtrl.close(), 'closed');
  t.mock.timers.tick(5000);
  assert.equal(closeCtrl.getPhase(), 'closed');
  assert.deepEqual(closePhases, ['animating', 'closed']);

  const disposePhases: MissionSceneModalPhase[] = [];
  const disposeCtrl = createMissionSceneController({
    onPhaseChange: (phase) => disposePhases.push(phase),
  });
  assert.equal(disposeCtrl.open('comms', 'normal', false), 'animating');
  disposeCtrl.dispose();
  assert.equal(disposeCtrl.getPhase(), 'closed');
  t.mock.timers.tick(5000);
  assert.equal(disposeCtrl.getPhase(), 'closed');
  assert.deepEqual(disposePhases, ['animating']);
});

test('mission-scene-machine: replay reinicia animating y cancela timer previo', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const phases: MissionSceneModalPhase[] = [];
  const controller = createMissionSceneController({
    onPhaseChange: (phase) => phases.push(phase),
  });

  assert.equal(controller.open('hydrate', 'normal', false), 'animating');
  t.mock.timers.tick(1500);
  assert.equal(controller.getPhase(), 'animating');

  assert.equal(controller.replay('hydrate', 'normal', false), 'animating');
  t.mock.timers.tick(600);
  assert.equal(controller.getPhase(), 'animating');

  t.mock.timers.tick(1200);
  assert.equal(controller.getPhase(), 'tablet');

  assert.equal(controller.replay('breathe', 'normal', false), 'animating');
  t.mock.timers.tick(4499);
  assert.equal(controller.getPhase(), 'animating');
  t.mock.timers.tick(1);
  assert.equal(controller.getPhase(), 'tablet');

  assert.deepEqual(phases, ['animating', 'tablet', 'animating', 'tablet']);
});

test('mission-scene-machine: getBreathPhaseLabel cubre Inhala, Sostén y Exhala en [0..1]', () => {
  assert.match(getBreathPhaseLabel(0), /Inhala/);
  assert.match(getBreathPhaseLabel(0.2), /Inhala/);
  assert.match(getBreathPhaseLabel(0.33), /Inhala/);

  assert.match(getBreathPhaseLabel(0.34), /Sostén/);
  assert.match(getBreathPhaseLabel(0.5), /Sostén/);
  assert.match(getBreathPhaseLabel(0.61), /Sostén/);

  assert.match(getBreathPhaseLabel(0.62), /Exhala/);
  assert.match(getBreathPhaseLabel(0.85), /Exhala/);
  assert.match(getBreathPhaseLabel(1), /Exhala/);
});

test('mission-scene-machine: getMissionSceneCopy no contiene textos de puntos ni niveles en ninguna acción', () => {
  const cases: Array<{ actionId: MissionActionId; variant: 'normal' | 'blocked' }> = [
    ...ALL_ACTIONS.map((actionId) => ({ actionId, variant: 'normal' as const })),
    { actionId: 'exercise', variant: 'blocked' },
  ];

  for (const { actionId, variant } of cases) {
    const copy = getMissionSceneCopy(actionId, variant, {
      restrictionReason: 'Pulso elevado en reposo',
      overallStatus: 'VERDE',
      readinessScore: 86,
      copiedToClipboard: true,
      sentAt: '2026-11-15T10:30:00.000Z',
      commsSending: false,
    });

    const fields = [
      copy.modalTitle,
      copy.pillText,
      copy.announcementAnimating,
      copy.announcementTablet,
      copy.badge,
      copy.headline,
      copy.actionsTitle,
      copy.replayLabel,
      ...copy.actions,
      ...copy.metrics.flatMap((m) => [m.label, m.value, m.delta]),
    ];

    for (const value of fields) {
      assert.equal(
        FORBIDDEN_GAMIFICATION_RE.test(value),
        false,
        `Texto prohibido detectado en ${actionId} (${variant}): "${value}"`
      );
    }
  }
});

test('mission-scene-machine: la hora de comunicaciones usa la hora local', () => {
  const sentAt = '2026-11-15T10:30:00.000Z';
  const expected = new Date(sentAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const copy = getMissionSceneCopy('comms', 'normal', { sentAt });
  assert.ok(copy.metrics.some((metric) => metric.delta === `Registro ${expected}`));
  const invalid = getMissionSceneCopy('comms', 'normal', { sentAt: 'fecha inválida' });
  assert.ok(invalid.metrics.some((metric) => metric.delta === 'Registro Hoy'));
});

test('SSR MissionActionModal renderiza escenas SVG animadas, Saltar y atributos de diálogo accesibles', async () => {
  await withCssStub(async () => {
    const { MissionActionModal } = await import('../src/components/home/studio/MissionActionModal');

    const closedHtml = renderToStaticMarkup(
      createElement(MissionActionModal, {
        open: false,
        actionId: 'hydrate',
        variant: 'normal',
        onClose: () => {},
      })
    );
    assert.equal(closedHtml, '');

    for (const actionId of ALL_ACTIONS) {
      const html = renderToStaticMarkup(
        createElement(MissionActionModal, {
          open: true,
          actionId,
          variant: 'normal',
          copyContext: { overallStatus: 'VERDE', readinessScore: 90 },
          onClose: () => {},
        })
      );

      assert.equal(html.includes('role="dialog"'), true);
      assert.equal(html.includes('aria-modal="true"'), true);
      const labelledByMatch = html.match(/aria-labelledby="([^"]+)"/);
      assert.ok(labelledByMatch, `Falta aria-labelledby en escena ${actionId}`);
      assert.equal(html.includes(`id="${labelledByMatch[1]}"`), true);
      assert.equal(html.includes(`mission-scene-${actionId}`), true);
      assert.equal(html.includes('Saltar'), true);
      assertNoForbiddenGamificationCopy(html);
    }
  });
});

test('SSR MissionActionModal renderiza ejercicio bloqueado directo en tablet con Ir a Controles y pausa respiratoria', async () => {
  await withCssStub(async () => {
    const { MissionActionModal } = await import('../src/components/home/studio/MissionActionModal');

    const withoutCallbacksHtml = renderToStaticMarkup(
      createElement(MissionActionModal, {
        open: true,
        actionId: 'exercise',
        variant: 'blocked',
        copyContext: { restrictionReason: 'Frecuencia cardíaca elevada en reposo' },
        onClose: () => {},
      })
    );

    assert.equal(withoutCallbacksHtml.includes('role="dialog"'), true);
    assert.equal(withoutCallbacksHtml.includes('aria-modal="true"'), true);
    assert.equal(withoutCallbacksHtml.includes('Saltar'), false);
    assert.equal(withoutCallbacksHtml.includes('Protocolo de seguridad activo'), true);
    assert.equal(withoutCallbacksHtml.includes('Frecuencia cardíaca elevada en reposo'), true);
    assert.equal(withoutCallbacksHtml.includes('Ir a Controles'), false);

    const withCallbacksHtml = renderToStaticMarkup(
      createElement(MissionActionModal, {
        open: true,
        actionId: 'exercise',
        variant: 'blocked',
        copyContext: { restrictionReason: 'Frecuencia cardíaca elevada en reposo' },
        onClose: () => {},
        onGoToControls: () => {},
        onOpenBreatherFromBlocked: () => {},
      })
    );

    assert.equal(withCallbacksHtml.includes('Ir a Controles'), true);
    assert.equal(withCallbacksHtml.includes('Hacer pausa de respiración'), true);
    assert.equal(withCallbacksHtml.includes('Saltar'), false);
    assertNoForbiddenGamificationCopy(withCallbacksHtml);

    const buttonsBefore = (withoutCallbacksHtml.match(/<button\b/g) ?? []).length;
    const buttonsAfter = (withCallbacksHtml.match(/<button\b/g) ?? []).length;
    assert.equal(buttonsAfter, buttonsBefore + 2);
  });
});

test('SSR MissionActionModal renderiza tablet de comms con overallStatus, readinessScore y sin textos prohibidos', async () => {
  await withCssStub(async () => {
    const { MissionActionModal } = await import('../src/components/home/studio/MissionActionModal');

    const html = withReducedMotionWindow(true, () =>
      renderToStaticMarkup(
        createElement(MissionActionModal, {
          open: true,
          actionId: 'comms',
          variant: 'normal',
          copyContext: {
            overallStatus: 'VERDE',
            readinessScore: 88,
            copiedToClipboard: true,
            sentAt: '2026-11-15T10:30:00.000Z',
            commsSending: false,
          },
          onClose: () => {},
        })
      )
    );

    assert.equal(html.includes('role="dialog"'), true);
    assert.equal(html.includes('aria-modal="true"'), true);
    assert.equal(html.includes('Saltar'), false);
    assert.equal(html.includes('VERDE'), true);
    assert.equal(html.includes('88/100'), true);
    assertNoForbiddenGamificationCopy(html);
  });
});

test('SSR MissionsTabPanel muestra 4 botones grandes, #btn-earth, sin título duplicado ni barras de progreso/racha', async () => {
  await withCssStub(async () => {
    const { MissionsTabPanel } = await import('../src/components/home/studio/MissionsTabPanel');

    const evaluation = evaluateHealth({ heart_rate: 72, bp_systolic: 118, bp_diastolic: 76 });
    const missions = createDefaultMissions();

    const zeroHtml = renderToStaticMarkup(
      createElement(MissionsTabPanel, {
        evaluation,
        userState: null,
        missions,
        completedLocalIds: [],
        commsSending: false,
        commsSentAt: null,
        onCompleteMission: () => {},
        onOpenBreather: () => {},
        onResetMissions: () => {},
        onPingEarth: () => {},
      })
    );

    assert.equal(zeroHtml.includes('Misiones de hoy'), false);
    assert.equal(zeroHtml.includes('class="card"'), false);
    assert.equal(zeroHtml.includes('Protocolos'), false);
    assert.equal(zeroHtml.includes('Racha'), false);
    assert.equal(zeroHtml.includes('role="progressbar"'), false);
    assert.equal(zeroHtml.includes('id="m-hydrate"'), true);
    assert.equal(zeroHtml.includes('hydrateTankSvg'), true);
    assert.equal(zeroHtml.includes('hydrateFaceMood'), true);
    assert.equal(zeroHtml.includes('data-hydration-mood="Malo"'), true);
    assert.equal(zeroHtml.includes('hydrateAstroSvg'), false);
    assert.equal(zeroHtml.includes('hydrateDroplet'), false);
    assert.equal(zeroHtml.includes('0/4'), true);
    assert.equal(zeroHtml.includes('Astronauta: Malo'), true);
    assert.equal(shouldOpenMissionModal('hydrate'), false);
    assert.equal(shouldOpenMissionModal('exercise'), false);
    assert.equal(shouldOpenMissionModal('rest'), false);
    assert.equal(shouldOpenMissionModal('breathe'), false);
    assert.equal(zeroHtml.includes('id="m-exercise"'), true);
    assert.equal(zeroHtml.includes('data-exercise-step="0"'), true);
    assert.equal(zeroHtml.includes('data-exercise-pose="Listo para activar"'), true);
    assert.equal(zeroHtml.includes('id="m-rest"'), true);
    assert.equal(zeroHtml.includes('Ciclo de Sueño'), false);
    assert.equal(zeroHtml.includes('Descanso / Dormir'), false);
    assert.equal(zeroHtml.includes('aria-pressed="false"'), true);
    assert.equal(zeroHtml.includes('data-night-active="false"'), true);
    assert.equal(zeroHtml.includes('data-porthole-sky="day"'), true);
    assert.equal(zeroHtml.includes('Activar Modo Noche'), true);
    assert.equal(/class="[^"]*\bnight-active\b/.test(zeroHtml), false);
    assert.equal(zeroHtml.includes('id="m-breathe"'), true);
    assert.equal(zeroHtml.includes('data-breath-rounds="0"'), true);
    assert.equal(zeroHtml.includes('id="breathArc"'), true);
    assert.equal(zeroHtml.includes('id="breathOrbGroup"'), true);
    assert.equal(zeroHtml.includes('0/2'), true);
    assert.equal(zeroHtml.includes('id="btn-earth"'), true);
    assertNoForbiddenGamificationCopy(zeroHtml);

    const exercisePoses = [
      { step: 1, label: 'Brazos arriba' },
      { step: 2, label: 'Giro orbital' },
      { step: 3, label: 'Flexión Cero-G' },
      { step: 4, label: '¡Salto estrella!' },
    ] as const;
    for (const pose of exercisePoses) {
      const stepHtml = renderToStaticMarkup(
        createElement(MissionsTabPanel, {
          evaluation,
          userState: null,
          missions,
          completedLocalIds: [],
          exerciseStep: pose.step,
          breathRounds: 1,
          restNightActive: false,
          commsSending: false,
          commsSentAt: null,
          onCompleteMission: () => {},
          onOpenBreather: () => {},
          onResetMissions: () => {},
          onPingEarth: () => {},
        })
      );
      assert.equal(stepHtml.includes(`data-exercise-step="${pose.step}"`), true);
      assert.equal(stepHtml.includes(`data-exercise-pose="${pose.label}"`), true);
      assert.equal(stepHtml.includes(`${pose.step}/4`), true);
      assert.equal(stepHtml.includes('data-breath-rounds="1"'), true);
      assert.equal(stepHtml.includes('1/2'), true);
      assert.equal(stepHtml.includes('Mantén 1 ronda más'), true);
      assertNoForbiddenGamificationCopy(stepHtml);
    }

    const dayToggleAfterCompleteHtml = renderToStaticMarkup(
      createElement(MissionsTabPanel, {
        evaluation,
        userState: createSampleUserState(evaluation),
        missions,
        completedLocalIds: ['rest'],
        restNightActive: false,
        commsSending: false,
        commsSentAt: null,
        onCompleteMission: () => {},
        onOpenBreather: () => {},
        onResetMissions: () => {},
        onPingEarth: () => {},
      })
    );
    assert.equal(/class="[^"]*\bnight-active\b/.test(dayToggleAfterCompleteHtml), false);
    assert.equal(dayToggleAfterCompleteHtml.includes('aria-pressed="false"'), true);
    assert.equal(dayToggleAfterCompleteHtml.includes('data-night-active="false"'), true);
    assert.equal(dayToggleAfterCompleteHtml.includes('Activar Modo Noche'), true);
    assertNoForbiddenGamificationCopy(dayToggleAfterCompleteHtml);

    const oneHtml = renderToStaticMarkup(
      createElement(MissionsTabPanel, {
        evaluation,
        userState: createSampleUserState(evaluation),
        missions,
        completedLocalIds: ['hydrate', 'exercise', 'rest', 'breathe'],
        commsSending: false,
        commsSentAt: '2026-11-15T10:30:00.000Z',
        onCompleteMission: () => {},
        onOpenBreather: () => {},
        onResetMissions: () => {},
        onPingEarth: () => {},
      })
    );

    assert.equal(oneHtml.includes('Reiniciar día'), true);
    assert.equal(oneHtml.includes('Lista ✓'), true);
    assert.equal(oneHtml.includes('data-hydration-mood="Excelente"'), true);
    assert.equal(oneHtml.includes('Tanque 4/4'), true);
    assert.equal(oneHtml.includes('Astronauta: Excelente'), true);
    assert.equal(oneHtml.includes('data-exercise-step="4"'), true);
    assert.equal(oneHtml.includes('¡Salto estrella!'), true);
    assert.equal(/class="[^"]*\bnight-active\b/.test(oneHtml), true);
    assert.equal(oneHtml.includes('aria-pressed="true"'), true);
    assert.equal(oneHtml.includes('data-night-active="true"'), true);
    assert.equal(oneHtml.includes('data-porthole-sky="night"'), true);
    assert.equal(oneHtml.includes('Modo Noche Activo ✓'), true);
    assert.equal(oneHtml.includes('data-breath-rounds="2"'), true);
    assert.equal(oneHtml.includes('Pulso estabilizado. Mente tranquila.'), true);
    assertNoForbiddenGamificationCopy(oneHtml);

    const blockedMissions = missions.map((m) =>
      m.id === 'exercise'
        ? { ...m, blockedByRestriction: true, restrictionReason: 'Alerta cardiovascular activa' }
        : m
    );
    const blockedHtml = renderToStaticMarkup(
      createElement(MissionsTabPanel, {
        evaluation,
        userState: null,
        missions: blockedMissions,
        completedLocalIds: [],
        exerciseStep: 3,
        commsSending: false,
        commsSentAt: null,
        onCompleteMission: () => {},
        onOpenBreather: () => {},
        onResetMissions: () => {},
        onPingEarth: () => {},
      })
    );

    assert.equal(blockedHtml.includes('id="m-exercise" aria-disabled="true"'), true);
    assert.equal(blockedHtml.includes('disabled=""'), false);
    assert.equal(blockedHtml.includes('Pausada'), true);
    assert.equal(blockedHtml.includes('data-exercise-step="0"'), true);
    assert.equal(blockedHtml.includes('Alerta cardiovascular activa'), true);
    assertNoForbiddenGamificationCopy(blockedHtml);
  });
});

test('getMissionSceneCopy maneja commsError sin afirmar Portapapeles y bitácora ✓', () => {
  const errCopy = getMissionSceneCopy('comms', 'normal', {
    overallStatus: 'AMARILLO',
    readinessScore: 71,
    commsError: 'Fallo de red',
  });
  assert.equal(errCopy.verdictClassName, 'verdict-danger');
  assert.equal(errCopy.headline, 'Fallo de red');
  assert.equal(errCopy.metrics[1].value.includes('✓'), false);
});
