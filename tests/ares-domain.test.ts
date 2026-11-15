import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ACTIONS,
  ALGORITHM_VERSION,
  DEFAULT_CONTEXT,
  REFERENCES,
  SCENARIOS,
  STATUS,
  analyzePersonalBaselines,
  computeCoverage,
  evaluateHealth,
  normalizeContext,
} from '../src/domain/health';
import type { PriorObservationInput } from '../src/domain/health/context-specs';
import { evaluateCrosses } from '../src/domain/health/cross-evaluator';
import { assessQuality } from '../src/domain/health/quality-restrictions';
import { evaluateBody, evaluateHeart, evaluateMind } from '../src/domain/health/systems-evaluator';
import { BASE_MISSIONS } from '../src/domain/missions/mission-catalog';
import { applyClinicalRestrictionsToMissions } from '../src/domain/missions/mission-safety';
import { loadDb, saveDb } from '../src/server/storage/file-store';
import { attemptCheckinRemoteSync } from '../src/server/storage/remote-sync';
import { createSeedDatabase } from '../src/server/storage/seed-data';
import type { CheckinEntry } from '../src/server/storage/types';

test('Prioriza alerta ROJA cardiovascular y restringe ejercicio extenuante', () => {
  const result = evaluateHealth({
    sleep_hours: 7.5,
    mood: 'excelente',
    heart_rate: 120,
    bp_systolic: 115,
    bp_diastolic: 75,
    glucose: 110,
    temperature: 36.6,
  });

  assert.equal(result.valid, true);
  assert.equal(result.algorithmVersion, ALGORITHM_VERSION);
  assert.equal(result.overallStatus, STATUS.RED);
  assert.equal(result.crossConclusion.status, STATUS.RED);
  assert.equal(result.crossConclusion.actionText, ACTIONS.COMMS.actionText);
  assert.notEqual(result.crossConclusion.actionText, ACTIONS.EXERCISE.actionText);
  assert.ok(result.scoreBreakdown.length > 0);
  assert.ok(result.ruleTraces.length > 0);
  assert.equal(result.clinicalRestrictions.restrictStrenuousExercise, true);

  const safeMissions = applyClinicalRestrictionsToMissions([...BASE_MISSIONS], result);
  const exerciseMission = safeMissions.find((m) => m.id === 'exercise');
  assert.equal(exerciseMission?.blockedByRestriction, true);
});

test('Soporta chequeos parciales, contexto de medición y rechaza formato inválido', () => {
  const emptyEval = evaluateHealth({});
  assert.equal(emptyEval.valid, false);
  assert.equal(emptyEval.overallStatus, STATUS.INSUFFICIENT_DATA);
  assert.equal(emptyEval.readinessScore, null);
  assert.equal(emptyEval.coverage.presentCount, 0);

  // Alerta ROJA parcial no se enmascara por ausencia de otros sistemas
  const partialRed = evaluateHealth({ heart_rate: 124 }, { context: { activityState: 'rest' } });
  assert.equal(partialRed.valid, true);
  assert.equal(partialRed.overallStatus, STATUS.RED);
  assert.equal(partialRed.coverage.presentCount, 1);
  assert.equal(partialRed.systems.heart.status, STATUS.RED);
  assert.equal(partialRed.systems.mind.status, STATUS.INSUFFICIENT_DATA);
  assert.equal(partialRed.systems.body.status, STATUS.INSUFFICIENT_DATA);

  // Prueba ortostática Tilt: FC > 100 clasificada en contexto ortostático (no alarma falsa de reposo)
  const tiltHr = evaluateHealth(
    { heart_rate: 112, bp_systolic: 118, bp_diastolic: 76 },
    { context: { activityState: 'orthostatic_tilt', posture: 'standing_tilt' } }
  );
  assert.equal(tiltHr.overallStatus, STATUS.YELLOW);
  assert.ok(tiltHr.ruleTraces.some((t) => t.ruleId === 'HEART_HR_ORTHOSTATIC_TILT'));

  // Glucemia 110 mg/dL sin ayuno confirmado no dispara falsa alerta amarilla; en ayunas sí
  const unknownGluc = evaluateHealth({ glucose: 110 }, { context: { glucoseTiming: 'unknown' } });
  assert.equal(unknownGluc.systems.body.status, STATUS.GREEN);
  assert.equal(unknownGluc.quality.tier, 'contextual_pending');
  assert.equal(unknownGluc.quality.needsRecheck, true);

  const fastingGluc = evaluateHealth({ glucose: 110 }, { context: { glucoseTiming: 'fasting' } });
  assert.equal(fastingGluc.systems.body.status, STATUS.YELLOW);
  assert.ok(fastingGluc.ruleTraces.some((t) => t.ruleId === 'BODY_GLUCOSE_ELEVATED'));

  const badText = evaluateHealth({ heart_rate: 'abc' });
  assert.equal(badText.valid, false);
  assert.ok(badText.fieldErrors.heart_rate);

  const badBp = evaluateHealth({ bp_systolic: 95, bp_diastolic: 90 });
  assert.equal(badBp.valid, false);
  assert.ok(badBp.fieldErrors.bp_diastolic);
});

test('Seed limpio sin datos falsos, escenarios oficiales y baseline causal libre de episodios RED', () => {
  assert.equal(ALGORITHM_VERSION, '3.0.0');
  assert.equal(evaluateHealth(SCENARIOS.critical).overallStatus, STATUS.RED);
  assert.equal(evaluateHealth(SCENARIOS.warning).overallStatus, STATUS.YELLOW);
  assert.equal(evaluateHealth(SCENARIOS.nominal).overallStatus, STATUS.GREEN);

  const seed = createSeedDatabase();
  for (const user of Object.values(seed.users)) {
    assert.equal(user.currentVitals, null);
    assert.equal(user.history.length, 0);
    assert.equal(user.observations?.length ?? 0, 0);
    assert.equal(user.gamification.xp, 0);
    assert.equal(user.gamification.streak, 0);
  }

  // Baseline causal: 4 lecturas basales en reposo (mediana HR = 60) + 1 episodio RED (HR = 132) excluido
  const priorObs: PriorObservationInput[] = [
    { observationId: 'p1', sortOrder: 1, overallStatus: 'GREEN', vitals: { heart_rate: 58 }, context: { activityState: 'rest' } },
    { observationId: 'p2', sortOrder: 2, overallStatus: 'GREEN', vitals: { heart_rate: 60 }, context: { activityState: 'rest' } },
    { observationId: 'p3', sortOrder: 3, overallStatus: 'GREEN', vitals: { heart_rate: 60 }, context: { activityState: 'rest' } },
    { observationId: 'p4', sortOrder: 4, overallStatus: 'GREEN', vitals: { heart_rate: 62 }, context: { activityState: 'rest' } },
    { observationId: 'p5', sortOrder: 5, overallStatus: 'RED', vitals: { heart_rate: 132 }, context: { activityState: 'rest' } },
  ];

  const driftEval = evaluateHealth(
    { heart_rate: 84 },
    { context: { activityState: 'rest' }, priorObservations: priorObs }
  );
  assert.equal(driftEval.baselines.heart_rate?.median, 60);
  assert.equal(driftEval.baselines.heart_rate?.n, 4);
  assert.equal(driftEval.baselines.heart_rate?.significantDrift, true);
  assert.equal(driftEval.overallStatus, STATUS.YELLOW);
});

test('Escritura atómica con recuperación desde .bak y cola honesta Supabase HTTP 404', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ares-bak-'));
  const dbPath = path.join(tmpDir, 'ares-db.json');
  process.env.ARES_DB_PATH = dbPath;

  try {
    const db = createSeedDatabase();
    const realEntry: CheckinEntry = {
      id: 'chk-test-1',
      dateKey: '2026-11-14',
      dayLabel: '14 Nov',
      timestamp: '2026-11-14T10:00:00.000Z',
      updatesCount: 1,
      algorithmVersion: ALGORITHM_VERSION,
      vitals: { heart_rate: 68, bp_systolic: 118, bp_diastolic: 76, temperature: 36.6 },
      context: {
        activityState: 'rest',
        posture: 'seated',
        glucoseTiming: 'unknown',
        tempMethod: 'oral',
        confirmedRepeated: false,
        symptoms: [],
      },
      overallStatus: STATUS.GREEN,
      readinessScore: 98,
      crossConclusionId: null,
      source: 'test_checkin',
    };
    db.users.elena.history.push(realEntry);
    db.users.elena.gamification.xp = 333;
    saveDb(db);
    db.users.elena.gamification.xp = 444;
    saveDb(db);
    fs.writeFileSync(dbPath, '{corrupted_json', 'utf8');

    const recovered = loadDb();
    assert.equal(recovered.users.elena.gamification.xp, 333);

    process.env.ARES_DISABLE_REMOTE_SYNC = '0';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

    const mockFetch: typeof fetch = async () => new Response('Not found', { status: 404 });
    await attemptCheckinRemoteSync(recovered, 'elena', realEntry, mockFetch);

    assert.equal(recovered.syncMeta.status, 'pending_retry');
    assert.equal(recovered.syncMeta.lastHttpStatus, 404);
    assert.equal(recovered.syncMeta.pendingCount, 1);
  } finally {
    delete process.env.ARES_DB_PATH;
    delete process.env.ARES_DISABLE_REMOTE_SYNC;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Prioridad RED + YELLOW sin degradación de acción en evaluateHeart, evaluateMind y evaluateBody', () => {
  // evaluateHeart: crisis hipertensiva (185/122) + hr = 105 en reposo mantiene ACTIONS.COMMS
  const heartOut = evaluateHeart(
    { bp_systolic: 185, bp_diastolic: 122, heart_rate: 105 },
    DEFAULT_CONTEXT,
    {}
  );
  assert.equal(heartOut.evaluation.status, STATUS.RED);
  assert.equal(heartOut.evaluation.actionIcon, ACTIONS.COMMS.actionIcon);
  assert.equal(heartOut.evaluation.actionText, ACTIONS.COMMS.actionText);

  // evaluateMind: sleep_hours = 4.5 + mood = 'cansado' mantiene ACTIONS.SLEEP
  const mindOut = evaluateMind(
    { sleep_hours: 4.5, mood: 'cansado' },
    DEFAULT_CONTEXT,
    {}
  );
  assert.equal(mindOut.evaluation.status, STATUS.RED);
  assert.equal(mindOut.evaluation.actionIcon, ACTIONS.SLEEP.actionIcon);
  assert.equal(mindOut.evaluation.actionText, ACTIONS.SLEEP.actionText);

  // evaluateBody: temperature = 38.4 + glucose = 115 en ayunas mantiene ACTIONS.ISOLATE y REFERENCES.FEVER
  const fastingCtx = normalizeContext({ glucoseTiming: 'fasting' });
  const bodyOut = evaluateBody(
    { temperature: 38.4, glucose: 115 },
    fastingCtx,
    {}
  );
  assert.equal(bodyOut.evaluation.status, STATUS.RED);
  assert.equal(bodyOut.evaluation.actionIcon, ACTIONS.ISOLATE.actionIcon);
  assert.equal(bodyOut.evaluation.actionText, ACTIONS.ISOLATE.actionText);
  assert.deepEqual(bodyOut.evaluation.reference, REFERENCES.FEVER);
});

test('cross-evaluator: hr=100, sbp=95 en post_exercise no dispara orthostatic_fluid_strain y normalizeContext hace fallback a DEFAULT_CONTEXT', () => {
  const postExCtx = normalizeContext({ activityState: 'post_exercise', posture: 'seated' });
  const postExEval = evaluateHealth({ heart_rate: 100, bp_systolic: 95, bp_diastolic: 65 }, { context: postExCtx });
  assert.equal(
    postExEval.triggeredCrosses.some((c) => c.id === 'orthostatic_fluid_strain'),
    false
  );

  // Confirmar también llamando evaluateCrosses directamente
  const directCross = evaluateCrosses(
    { heart_rate: 100, bp_systolic: 95, bp_diastolic: 65 },
    postExCtx,
    postExEval.systems
  );
  assert.equal(
    directCross.triggeredCrosses.some((c) => c.id === 'orthostatic_fluid_strain'),
    false
  );

  // normalizeContext rechaza valores fuera de catálogo haciendo fallback a DEFAULT_CONTEXT
  const normalized = normalizeContext({
    activityState: 'zero_g_sprint' as never,
    posture: 'upside_down' as never,
    glucoseTiming: 'midnight_snack' as never,
    tempMethod: 'infrared_laser' as never,
  });
  assert.equal(normalized.activityState, DEFAULT_CONTEXT.activityState);
  assert.equal(normalized.posture, DEFAULT_CONTEXT.posture);
  assert.equal(normalized.glucoseTiming, DEFAULT_CONTEXT.glucoseTiming);
  assert.equal(normalized.tempMethod, DEFAULT_CONTEXT.tempMethod);
});

test('baseline-analyzer: ordena priorObservations cronológicamente antes de detectar tendencia y en fasting excluye random/unknown', () => {
  // Desordenadas: cronológicamente [60, 65, 72] -> con actual 78 da 'rising' (sin ordenar [72, 65, 60, 78] sería 'stable')
  const unorderedPriors: PriorObservationInput[] = [
    {
      observationId: 'obs-3',
      capturedAt: '2026-11-12T10:00:00.000Z',
      overallStatus: 'GREEN',
      vitals: { heart_rate: 72 },
      context: { activityState: 'rest' },
    },
    {
      observationId: 'obs-1',
      capturedAt: '2026-11-10T10:00:00.000Z',
      overallStatus: 'GREEN',
      vitals: { heart_rate: 60 },
      context: { activityState: 'rest' },
    },
    {
      observationId: 'obs-2',
      capturedAt: '2026-11-11T10:00:00.000Z',
      overallStatus: 'GREEN',
      vitals: { heart_rate: 65 },
      context: { activityState: 'rest' },
    },
  ];

  const hrBaselines = analyzePersonalBaselines({ heart_rate: 78 }, DEFAULT_CONTEXT, unorderedPriors);
  assert.equal(hrBaselines.heart_rate?.n, 3);
  assert.equal(hrBaselines.heart_rate?.trendDirection, 'rising');

  // También por sortOrder explícito desordenado
  const unorderedBySortOrder: PriorObservationInput[] = [
    { observationId: 's3', sortOrder: 30, overallStatus: 'GREEN', vitals: { heart_rate: 72 }, context: { activityState: 'rest' } },
    { observationId: 's1', sortOrder: 10, overallStatus: 'GREEN', vitals: { heart_rate: 60 }, context: { activityState: 'rest' } },
    { observationId: 's2', sortOrder: 20, overallStatus: 'GREEN', vitals: { heart_rate: 65 }, context: { activityState: 'rest' } },
  ];
  const sortOrderBaselines = analyzePersonalBaselines({ heart_rate: 78 }, DEFAULT_CONTEXT, unorderedBySortOrder);
  assert.equal(sortOrderBaselines.heart_rate?.trendDirection, 'rising');

  // En fasting excluye random y unknown
  const mixedGlucosePriors: PriorObservationInput[] = [
    { observationId: 'g1', overallStatus: 'GREEN', vitals: { glucose: 82 }, context: { glucoseTiming: 'fasting' } },
    { observationId: 'g2', overallStatus: 'GREEN', vitals: { glucose: 86 }, context: { glucoseTiming: 'fasting' } },
    { observationId: 'g3', overallStatus: 'GREEN', vitals: { glucose: 150 }, context: { glucoseTiming: 'random' } },
    { observationId: 'g4', overallStatus: 'GREEN', vitals: { glucose: 165 }, context: { glucoseTiming: 'unknown' } },
    { observationId: 'g5', overallStatus: 'GREEN', vitals: { glucose: 170 } },
  ];
  const fastingContext = normalizeContext({ glucoseTiming: 'fasting' });
  const glucBaselines = analyzePersonalBaselines({ glucose: 88 }, fastingContext, mixedGlucosePriors);
  assert.equal(glucBaselines.glucose?.n, 2);
  assert.equal(glucBaselines.glucose?.median, 84);
});

test('quality-restrictions: glucose=45 con glucoseTiming=unknown y confirmedRepeated=true con alta cobertura no retorna verified y exige recheck', () => {
  const vitals = {
    sleep_hours: 7.5,
    mood: 'bien' as const,
    heart_rate: 72,
    bp_systolic: 116,
    bp_diastolic: 74,
    temperature: 36.6,
    glucose: 45,
  };
  const ctx = normalizeContext({ glucoseTiming: 'unknown', confirmedRepeated: true });
  const coverage = computeCoverage(vitals);
  assert.equal(coverage.presentCount, 7);

  const directQuality = assessQuality({
    vitals,
    context: ctx,
    coverage,
    overallStatus: STATUS.RED,
  });
  assert.notEqual(directQuality.tier, 'verified');
  assert.equal(directQuality.tier, 'contextual_pending');
  assert.equal(directQuality.needsRecheck, true);
  assert.equal(directQuality.contextComplete, false);

  const fullEval = evaluateHealth(vitals, { context: ctx });
  assert.notEqual(fullEval.quality.tier, 'verified');
  assert.equal(fullEval.quality.needsRecheck, true);
});
