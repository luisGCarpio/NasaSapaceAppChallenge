import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { runRetrospectiveNasaBenchmark } from '../src/domain/nasa/benchmark-runner';
import type { NasaAuditInventory, NasaResearchObservation } from '../src/domain/nasa/nasa-types';
import { getNasaSubjectTimeline } from '../src/server/repositories/nasa-datasets-repo';

const NORM_DIR = path.join(process.cwd(), 'data', 'nasa-normalized');

test('Datasets NASA ingestados son 100% reales y sin imputación de campos ausentes', async () => {
  const [invRaw, obsRaw] = await Promise.all([
    fs.readFile(path.join(NORM_DIR, 'audit-inventory.json'), 'utf8'),
    fs.readFile(path.join(NORM_DIR, 'observations.json'), 'utf8'),
  ]);

  const inventory = JSON.parse(invRaw) as NasaAuditInventory;
  const observations = JSON.parse(obsRaw) as NasaResearchObservation[];

  assert.equal(inventory.datasets.length, 6);
  assert.equal(observations.length, inventory.totalValidObservations);
  assert.ok(inventory.totalValidObservations >= 3900);
  assert.ok(inventory.totalFilesProcessed >= 150);

  // Verificar que nunca se fabrican campos ausentes entre estudios heterogéneos
  for (const obs of observations) {
    if (obs.studyId === 'OSD-575' || obs.studyId === 'MR010G_C3_LAB') {
      assert.equal(typeof obs.vitals.glucose, 'number');
      assert.equal(obs.vitals.heart_rate, undefined);
      assert.equal(obs.vitals.sleep_hours, undefined);
      assert.equal(obs.vitals.temperature, undefined);
    } else if (obs.studyId === 'BRSMACT_C1_SLEEP') {
      assert.equal(typeof obs.vitals.sleep_hours, 'number');
      assert.equal(obs.vitals.heart_rate, undefined);
      assert.equal(obs.vitals.glucose, undefined);
    } else if (obs.studyId === 'MR001G_C3_TILT') {
      assert.equal(obs.vitals.glucose, undefined);
      assert.equal(obs.vitals.temperature, undefined);
      assert.equal(obs.vitals.sleep_hours, undefined);
    } else if (obs.studyId === 'CRF_C3_SYMPTOMS') {
      assert.equal(Object.keys(obs.vitals).length, 0);
      assert.ok(obs.context.symptoms.length >= 1);
    }
  }
});

test('Benchmark retrospectivo v2.0.0 vs v3.0.0 demuestra cobertura 100% contextual y cero conflictos de misiones', async () => {
  const obsRaw = await fs.readFile(path.join(NORM_DIR, 'observations.json'), 'utf8');
  const observations = JSON.parse(obsRaw) as NasaResearchObservation[];
  const metrics = runRetrospectiveNasaBenchmark(observations);

  assert.equal(metrics.engineVersion, '3.0.0');
  assert.equal(metrics.totalObservationsEvaluated, observations.length);
  assert.ok(metrics.withQuantitativeVitals > 3000);
  assert.equal(metrics.v2EvaluableCount, 0);
  assert.equal(metrics.v2CoverageRatePct, 0);
  assert.equal(metrics.v3EvaluableCount, metrics.withQuantitativeVitals);
  assert.equal(metrics.v3CoverageRatePct, 100);

  // En prueba ortostática Tilt real con FC > 100: 64 observaciones (101-164 lpm) se clasifican
  // como respuesta ortostática contextual (no pánico de reposo), y los 6 picos extremos (>=165 lpm)
  // escalan legítimamente a RED por seguridad clínica.
  assert.equal(metrics.tiltWithHr100PlusTotal, 70);
  assert.equal(metrics.tiltClassifiedAsOrthostaticNotRestPanic, 64);

  // Glucemias 100-139 mg/dL sin ayuno confirmado no disparan falsa alerta amarilla automática
  assert.ok(metrics.unknownGlucose100to139Count > 0);
  assert.equal(metrics.unknownGlucoseFlaggedContextualConfirmation, metrics.unknownGlucose100to139Count);

  // En v3 ninguna recomendación de ejercicio activo colisiona con alerta/fiebre/hipoglucemia/crisis CV
  assert.ok(metrics.observationsWithExerciseRestriction > 50);
  assert.equal(metrics.missionVsClinicalConflictsV2, metrics.observationsWithExerciseRestriction);
  assert.equal(metrics.missionVsClinicalConflictsV3, 0);
  assert.ok(metrics.sampleRecoveredAlerts.length > 0);

  // Verificar timeline real de astronauta Inspiration4 I4-C002 sin alteración de valores reales
  const i4Timeline = await getNasaSubjectTimeline('I4-C002');
  assert.ok(i4Timeline.subject);
  assert.equal(i4Timeline.subject.missionType, 'spaceflight');
  assert.ok(i4Timeline.points.some((p) => p.observation.vitals.glucose === 44 && p.evaluation.overallStatus === 'RED'));
});
