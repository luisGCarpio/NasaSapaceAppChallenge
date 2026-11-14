import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, beforeEach } from 'node:test';
import { POST as loginPost } from '../src/app/api/auth/login/route';
import { POST as registerPost } from '../src/app/api/auth/register/route';
import { POST as checkinPost } from '../src/app/api/checkin/route';
import { POST as evaluatePost } from '../src/app/api/evaluate/route';
import { POST as missionCompletePost } from '../src/app/api/mission/complete/route';
import { POST as missionResetPost } from '../src/app/api/mission/reset/route';
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

test('Autenticación segura: rechaza quickLogin, claves vacías y cabeceras x-user-id suplantadas', async () => {
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
});

test('Registro inicia sin vitales falsos, evalúa 422 y rechaza JSON malformado con 400', async () => {
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
});

test('Check-in: bloquea simulaciones, deduplica por clientSubmissionId, consolida fecha y protege XP diario', async () => {
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
  const updateData = (await updateSameDay.json()) as { consolidated: boolean; entry: { updatesCount: number } };
  assert.equal(updateData.consolidated, true);
  assert.equal(updateData.entry.updatesCount, 2);

  const m1 = await missionCompletePost(jsonReq('http://localhost/api/mission/complete', { missionId: 'hydrate' }, token));
  const m1Data = (await m1.json()) as { awardedXp: number; state: { gamification: { xp: number } } };
  assert.equal(m1Data.awardedXp, 25);

  await missionResetPost(jsonReq('http://localhost/api/mission/reset', {}, token));
  const m2 = await missionCompletePost(jsonReq('http://localhost/api/mission/complete', { missionId: 'hydrate' }, token));
  const m2Data = (await m2.json()) as { awardedXp: number; alreadyAwardedToday: boolean };
  assert.equal(m2Data.awardedXp, 0);
  assert.equal(m2Data.alreadyAwardedToday, true);
});
