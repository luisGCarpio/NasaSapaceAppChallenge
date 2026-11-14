import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ACTIONS,
  ALGORITHM_VERSION,
  SCENARIOS,
  STATUS,
  evaluateHealth,
} from '../src/domain/health';
import type { PriorObservationInput } from '../src/domain/health/context-specs';
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
