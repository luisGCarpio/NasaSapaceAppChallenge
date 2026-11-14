import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, beforeEach } from 'node:test';
import { NextRequest } from 'next/server';
import { POST as loginPost } from '../src/app/api/auth/login/route';
import { POST as registerPost } from '../src/app/api/auth/register/route';
import { POST as checkinPost } from '../src/app/api/checkin/route';
import { POST as evaluatePost } from '../src/app/api/evaluate/route';
import { POST as missionCompletePost } from '../src/app/api/mission/complete/route';
import { POST as missionResetPost } from '../src/app/api/mission/reset/route';
import { GET as nasaDatasetsGet } from '../src/app/api/nasa-datasets/route';
import { POST as scenarioPost } from '../src/app/api/scenario/[id]/route';
import { GET as stateGet } from '../src/app/api/state/route';
import { SCENARIOS } from '../src/domain/health';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ares-api-'));
const testDbPath = path.join(tmpDir, 'ares-db.json');

beforeEach(() => {
  process.env.ARES_DB_PATH = testDbPath;
  process.env.ARES_DISABLE_REMOTE_SYNC = '1';
  for (const suffix of ['', '.bak', '.tmp']) {
    if (fs.existsSync(`${testDbPath}${suffix}`)) {
      fs.rmSync(`${testDbPath}${suffix}`, { force: true });
    }
  }
});

after(() => {
  delete process.env.ARES_DB_PATH;
  delete process.env.ARES_DISABLE_REMOTE_SYNC;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function jsonReq(url: string, body: unknown, token?: string): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('Autenticación segura e inicio limpio sin vitales ni historial falsos', async () => {
  const quickRes = await loginPost(jsonReq('http://localhost/api/auth/login', { username: 'elena', quickLogin: true }));
  assert.equal(quickRes.status, 400);

  const badPass = await loginPost(jsonReq('http://localhost/api/auth/login', { identifier: 'elena', password: 'wrong' }));
  assert.equal(badPass.status, 401);

  const spoofRes = await stateGet(new Request('http://localhost/api/state', { headers: { 'x-user-id': 'elena' } }));
  assert.equal(spoofRes.status, 401);

  const okRes = await loginPost(jsonReq('http://localhost/api/auth/login', { identifier: 'elena', password: '123' }));
  assert.equal(okRes.status, 200);
  const okData = (await okRes.json()) as { token: string };
  assert.ok(okData.token);
  assert.ok(okRes.headers.get('set-cookie')?.includes('ares_session='));

  const stateRes = await stateGet(new Request('http://localhost/api/state', { headers: { Authorization: `Bearer ${okData.token}` } }));
  assert.equal(stateRes.status, 200);
  const stateBody = (await stateRes.json()) as {
    currentVitals: unknown;
    history: unknown[];
    observations: unknown[];
    evaluation: { overallStatus: string };
  };
  assert.equal(stateBody.currentVitals, null);
  assert.equal(stateBody.history.length, 0);
  assert.equal(stateBody.observations.length, 0);
  assert.equal(stateBody.evaluation.overallStatus, 'INSUFFICIENT_DATA');
});

test('Registro limpio, evaluación parcial/contextual v3.0.0 y rechazo 400/422', async () => {
  const shortPass = await registerPost(
    jsonReq('http://localhost/api/auth/register', { name: 'Ana', username: 'ana', password: '123' })
  );
  assert.equal(shortPass.status, 400);

  const regRes = await registerPost(
    jsonReq('http://localhost/api/auth/register', { name: 'Esp. Lucía', username: 'lucia', password: 'secret-password' })
  );
  assert.equal(regRes.status, 201);
  const regBody = (await regRes.json()) as { state: { currentVitals: unknown; evaluation: { overallStatus: string; readinessScore: unknown } } };
  assert.equal(regBody.state.currentVitals, null);
  assert.equal(regBody.state.evaluation.overallStatus, 'INSUFFICIENT_DATA');
  assert.equal(regBody.state.evaluation.readinessScore, null);

  const malformed = await evaluatePost(jsonReq('http://localhost/api/evaluate', '{invalid-json'));
  assert.equal(malformed.status, 400);

  const invalidVitals = await evaluatePost(jsonReq('http://localhost/api/evaluate', { heart_rate: 'abc' }));
  assert.equal(invalidVitals.status, 422);

  // Evaluación parcial con contexto ortostático Tilt
  const partialRes = await evaluatePost(
    jsonReq('http://localhost/api/evaluate', {
      vitals: { heart_rate: 112 },
      context: { activityState: 'orthostatic_tilt', posture: 'standing_tilt' },
    })
  );
  assert.equal(partialRes.status, 200);
  const partialBody = (await partialRes.json()) as {
    valid: boolean;
    evaluation: {
      algorithmVersion: string;
      overallStatus: string;
      coverage: { presentCount: number };
      ruleTraces: Array<{ ruleId: string }>;
    };
  };
  assert.equal(partialBody.valid, true);
  assert.equal(partialBody.evaluation.algorithmVersion, '3.0.0');
  assert.equal(partialBody.evaluation.overallStatus, 'YELLOW');
  assert.equal(partialBody.evaluation.coverage.presentCount, 1);
  assert.ok(partialBody.evaluation.ruleTraces.some((r) => r.ruleId === 'HEART_HR_ORTHOSTATIC_TILT'));
});

test('Check-in: bloquea simulaciones, preserva observaciones intra-día y restringe ejercicio en RED', async () => {
  const loginRes = await loginPost(jsonReq('http://localhost/api/auth/login', { identifier: 'elena', password: '123' }));
  const { token } = (await loginRes.json()) as { token: string };

  const simRes = await scenarioPost(new Request('http://localhost/api/scenario/critical', { method: 'POST' }), {
    params: Promise.resolve({ id: 'critical' }),
  });
  assert.equal(simRes.status, 200);

  const saveSim = await checkinPost(
    jsonReq('http://localhost/api/checkin', { vitals: SCENARIOS.critical, isSimulation: true }, token)
  );
  assert.equal(saveSim.status, 400);

  const firstSave = await checkinPost(
    jsonReq('http://localhost/api/checkin', { vitals: SCENARIOS.warning, clientSubmissionId: 'sub-1', dateKey: '2026-11-15' }, token)
  );
  assert.equal(firstSave.status, 200);
  const firstData = (await firstSave.json()) as { consolidated: boolean; deduplicated: boolean; entry: { updatesCount: number } };
  assert.equal(firstData.consolidated, false);
  assert.equal(firstData.entry.updatesCount, 1);

  const replaySave = await checkinPost(
    jsonReq('http://localhost/api/checkin', { vitals: SCENARIOS.warning, clientSubmissionId: 'sub-1', dateKey: '2026-11-15' }, token)
  );
  const replayData = (await replaySave.json()) as { deduplicated: boolean; entry: { updatesCount: number } };
  assert.equal(replayData.deduplicated, true);
  assert.equal(replayData.entry.updatesCount, 1);

  const updateSameDay = await checkinPost(
    jsonReq('http://localhost/api/checkin', { vitals: SCENARIOS.nominal, clientSubmissionId: 'sub-2', dateKey: '2026-11-15' }, token)
  );
  const updateData = (await updateSameDay.json()) as {
    consolidated: boolean;
    entry: { updatesCount: number };
    state: { observations: unknown[]; history: unknown[] };
  };
  assert.equal(updateData.consolidated, true);
  assert.equal(updateData.entry.updatesCount, 2);
  assert.equal(updateData.state.history.length, 1);
  assert.equal(updateData.state.observations.length, 2);

  // Check-in crítico real -> ejercicio restringido clínicamente (HTTP 400)
  const criticalSave = await checkinPost(
    jsonReq(
      'http://localhost/api/checkin',
      {
        vitals: SCENARIOS.critical,
        context: { activityState: 'rest' },
        clientSubmissionId: 'sub-3-red',
        dateKey: '2026-11-16',
      },
      token
    )
  );
  assert.equal(criticalSave.status, 200);
  const criticalBody = (await criticalSave.json()) as {
    evaluation: { clinicalRestrictions: { restrictStrenuousExercise: boolean } };
  };
  assert.equal(criticalBody.evaluation.clinicalRestrictions.restrictStrenuousExercise, true);

  const blockedEx = await missionCompletePost(
    jsonReq('http://localhost/api/mission/complete', { missionId: 'exercise' }, token)
  );
  assert.equal(blockedEx.status, 400);

  // Hidratación sí permitida y protege XP diario frente a reset
  const m1 = await missionCompletePost(jsonReq('http://localhost/api/mission/complete', { missionId: 'hydrate' }, token));
  const m1Data = (await m1.json()) as { awardedXp: number; state: { gamification: { xp: number } } };
  assert.equal(m1Data.awardedXp, 25);

  await missionResetPost(jsonReq('http://localhost/api/mission/reset', {}, token));
  const m2 = await missionCompletePost(jsonReq('http://localhost/api/mission/complete', { missionId: 'hydrate' }, token));
  const m2Data = (await m2.json()) as { awardedXp: number; alreadyAwardedToday: boolean };
  assert.equal(m2Data.awardedXp, 0);
  assert.equal(m2Data.alreadyAwardedToday, true);
});

test('API /api/nasa-datasets entrega auditoría real y timeline de sujeto oficial', async () => {
  const benchRes = await nasaDatasetsGet(new NextRequest('http://localhost/api/nasa-datasets?view=benchmark'));
  assert.equal(benchRes.status, 200);
  const benchJson = (await benchRes.json()) as {
    inventory: { datasets: unknown[]; totalValidObservations: number };
    benchmark: { v2CoverageRatePct: number; v3CoverageRatePct: number; missionVsClinicalConflictsV3: number };
  };
  assert.equal(benchJson.inventory.datasets.length, 6);
  assert.ok(benchJson.inventory.totalValidObservations > 3900);
  assert.equal(benchJson.benchmark.v2CoverageRatePct, 0);
  assert.equal(benchJson.benchmark.v3CoverageRatePct, 100);
  assert.equal(benchJson.benchmark.missionVsClinicalConflictsV3, 0);

  const subjRes = await nasaDatasetsGet(new NextRequest('http://localhost/api/nasa-datasets?subjectId=C3-6043'));
  assert.equal(subjRes.status, 200);
  const subjJson = (await subjRes.json()) as {
    subject: { subjectId: string; vitalsCount: number };
    points: unknown[];
    v2EvaluablePoints: number;
    v3EvaluablePoints: number;
  };
  assert.equal(subjJson.subject.subjectId, 'C3-6043');
  assert.ok(subjJson.points.length > 50);
  assert.equal(subjJson.v2EvaluablePoints, 0);
  assert.equal(subjJson.v3EvaluablePoints, subjJson.subject.vitalsCount);
});
