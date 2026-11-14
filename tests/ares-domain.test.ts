import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ALGORITHM_VERSION, SCENARIOS, STATUS, evaluateHealth } from '../src/domain/health';
import { loadDb, saveDb } from '../src/server/storage/file-store';
import { attemptCheckinRemoteSync } from '../src/server/storage/remote-sync';
import { createSeedDatabase } from '../src/server/storage/seed-data';

test('Prioriza alerta ROJA cardiovascular sobre sugerencia metabólica amarilla', () => {
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
  assert.equal(result.overallStatus, STATUS.RED);
  assert.equal(result.crossConclusion.status, STATUS.RED);
  assert.equal(result.crossConclusion.actionText, 'Avisar al equipo / Tierra en 1 clic');
  assert.notEqual(result.crossConclusion.actionText, 'Ejercicio / Estiramiento (30 min)');
  assert.ok(result.scoreBreakdown.length > 0);
});

test('Rechaza entradas vacías, texto no numérico o presión arterial incoherente', () => {
  const emptyEval = evaluateHealth({});
  assert.equal(emptyEval.valid, false);
  assert.equal(emptyEval.overallStatus, STATUS.INSUFFICIENT_DATA);
  assert.equal(emptyEval.readinessScore, null);
  assert.ok(emptyEval.errors.length >= 6);

  const badText = evaluateHealth({
    sleep_hours: 7,
    mood: 'bien',
    heart_rate: 'abc',
    bp_systolic: 115,
    bp_diastolic: 75,
    glucose: 90,
    temperature: 36.6,
  });
  assert.equal(badText.valid, false);
  assert.ok(badText.fieldErrors.heart_rate);

  const badBp = evaluateHealth({
    sleep_hours: 7,
    mood: 'bien',
    heart_rate: 70,
    bp_systolic: 95,
    bp_diastolic: 90,
    glucose: 90,
    temperature: 36.6,
  });
  assert.equal(badBp.valid, false);
  assert.ok(badBp.fieldErrors.bp_diastolic);
});

test('Coherencia exacta del seed v2.0.0 y escenarios clínicos', () => {
  assert.equal(evaluateHealth(SCENARIOS.critical).overallStatus, STATUS.RED);
  assert.equal(evaluateHealth(SCENARIOS.warning).overallStatus, STATUS.YELLOW);
  assert.equal(evaluateHealth(SCENARIOS.nominal).overallStatus, STATUS.GREEN);

  const seed = createSeedDatabase();
  for (const user of Object.values(seed.users)) {
    for (const entry of user.history) {
      assert.match(entry.dateKey, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(entry.algorithmVersion, ALGORITHM_VERSION);
      const recalculated = evaluateHealth(entry.vitals);
      assert.equal(entry.overallStatus, recalculated.overallStatus);
      assert.equal(entry.readinessScore, recalculated.readinessScore);
    }
  }
});

test('Escritura atómica con recuperación desde .bak y fallo honesto Supabase HTTP 404', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ares-bak-'));
  const dbPath = path.join(tmpDir, 'ares-db.json');
  process.env.ARES_DB_PATH = dbPath;

  try {
    const db = createSeedDatabase();
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
    await attemptCheckinRemoteSync(recovered, 'elena', recovered.users.elena.history[0], mockFetch);

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
