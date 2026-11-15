import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { evaluateHealth } from '../src/domain/health';
import { runRetrospectiveNasaBenchmark } from '../src/domain/nasa/benchmark-runner';
import {
  evaluateNasaOperationalDecision,
  simulateGravityReentryStress,
} from '../src/domain/nasa/cohort-decision';
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

test('Motor de Decisión Operativa NASA y Simulador de Gravedad MR001G_C3_TILT clasifican niveles 0 a 3', () => {
  // 1) Nominal (Nivel 0): FC 68, PA 115/72, Temp 36.5, Glucosa 84, Sueño 7.5h
  const nominalVitals = {
    heart_rate: 68,
    bp_systolic: 115,
    bp_diastolic: 72,
    temperature: 36.5,
    glucose: 84,
    sleep_hours: 7.5,
  };
  const nominalEval = evaluateHealth(nominalVitals);
  const nominalDec = evaluateNasaOperationalDecision(nominalVitals, nominalEval);

  assert.equal(nominalDec.triageLevel, 'LEVEL_0_AUTONOMOUS_NOMINAL');
  assert.equal(nominalDec.requiresEarthIntervention, false);
  assert.equal(nominalDec.evaCleared, true);
  assert.equal(nominalDec.returnToGravityReady, true);
  assert.equal(nominalDec.gravitySimulation.verdict, 'GO_FOR_LANDING');
  assert.equal(nominalDec.gravitySimulation.projectedTiltHr, 128); // 68 + 60 bpm (mediana MR001G)

  // 2) Contramedida Autónoma a Bordo (Nivel 1): sueño reducido 6.2h / pulso 80 bpm (necesita traje/fluidos en modo vulnerable)
  const mildVitals = {
    heart_rate: 76,
    bp_systolic: 116,
    bp_diastolic: 74,
    sleep_hours: 6.3,
  };
  const mildEval = evaluateHealth(mildVitals);
  const mildDec = evaluateNasaOperationalDecision(
    mildVitals,
    mildEval,
    undefined,
    'post_bedrest_median'
  );
  assert.equal(mildDec.triageLevel, 'LEVEL_1_ONBOARD_COUNTERMEASURE');
  assert.equal(mildDec.requiresEarthIntervention, false);
  assert.equal(mildDec.gravitySimulation.verdict, 'COUNTERMEASURE_REQUIRED_BEFORE_LANDING');

  // 3) Intervención de Tierra Requerida (Nivel 2): múltiples extremos >P95 y presíncope proyectado en MR001G
  const earthVitals = {
    heart_rate: 96,
    bp_systolic: 138,
    bp_diastolic: 88,
    temperature: 37.4,
  };
  const earthEval = evaluateHealth(earthVitals);
  const earthDec = evaluateNasaOperationalDecision(earthVitals, earthEval);
  assert.equal(earthDec.triageLevel, 'LEVEL_2_EARTH_INTERVENTION');
  assert.equal(earthDec.requiresEarthIntervention, true);
  assert.equal(earthDec.evaCleared, false);
  assert.equal(earthDec.gravitySimulation.verdict, 'PRESYNCOPE_ABORT_RISK');

  // 4) Aborto Operativo / Retorno (Nivel 3): hipoglucemia severa post-vuelo (44 mg/dL en OSD-575) o taquicardia severa
  const abortVitals = {
    glucose: 44,
    heart_rate: 124,
    bp_systolic: 88,
    bp_diastolic: 60,
  };
  const abortEval = evaluateHealth(abortVitals);
  const abortDec = evaluateNasaOperationalDecision(abortVitals, abortEval);
  assert.equal(abortDec.triageLevel, 'LEVEL_3_MISSION_ABORT_OR_RETURN');
  assert.equal(abortDec.requiresEarthIntervention, true);
  assert.equal(abortDec.evaCleared, false);
  assert.equal(abortDec.returnToGravityReady, false);

  // 5) Simulador MR001G_C3_TILT directo en modo vulnerable (P75/P25: +69 bpm, -16 mmHg PAS)
  const simVulnerable = simulateGravityReentryStress(
    { heart_rate: 82, bp_systolic: 108, bp_diastolic: 72 },
    { posture: 'supine', activityState: 'rest' },
    'post_bedrest_p25_vulnerable'
  );
  assert.equal(simVulnerable.projectedTiltHr, 151);
  assert.equal(simVulnerable.projectedTiltSbp, 92);
  assert.equal(simVulnerable.verdict, 'PRESYNCOPE_ABORT_RISK');
});

test('MR001G_C3_TILT con vitales normales (118/78, HR 72, supine) no dispara PRESYNCOPE_ABORT_RISK ni LEVEL_2 en ningún modo', () => {
  const normalVitals = {
    heart_rate: 72,
    bp_systolic: 118,
    bp_diastolic: 78,
  };
  const supineContext = { posture: 'supine' as const, activityState: 'rest' as const };
  const evaluation = evaluateHealth(normalVitals, { context: supineContext });
  assert.equal(evaluation.overallStatus, 'GREEN');

  for (const mode of ['post_bedrest_median', 'post_bedrest_p25_vulnerable'] as const) {
    const sim = simulateGravityReentryStress(normalVitals, supineContext, mode);
    assert.notEqual(sim.verdict, 'PRESYNCOPE_ABORT_RISK');
    assert.equal(sim.verdict, 'COUNTERMEASURE_REQUIRED_BEFORE_LANDING');

    const decision = evaluateNasaOperationalDecision(normalVitals, evaluation, supineContext, mode);
    assert.notEqual(decision.triageLevel, 'LEVEL_2_EARTH_INTERVENTION');
    assert.notEqual(decision.triageLevel, 'LEVEL_3_MISSION_ABORT_OR_RETURN');
    assert.equal(decision.triageLevel, 'LEVEL_1_ONBOARD_COUNTERMEASURE');
    assert.equal(decision.requiresEarthIntervention, false);
    assert.notEqual(decision.gravitySimulation.verdict, 'PRESYNCOPE_ABORT_RISK');
  }
});

test('evaluateNasaOperationalDecision: hipotermia <35.0 y PAD <50 disparan LEVEL_3; HR 125 en EVA/Tilt no dispara LEVEL_3; LEVEL_2 con RED bloquea retorno a gravedad', () => {
  // 1) Hipotermia < 35.0 °C -> LEVEL_3
  const hypothermiaVitals = { temperature: 34.8 };
  const hypothermiaEval = evaluateHealth(hypothermiaVitals);
  const hypothermiaDec = evaluateNasaOperationalDecision(hypothermiaVitals, hypothermiaEval);
  assert.equal(hypothermiaDec.triageLevel, 'LEVEL_3_MISSION_ABORT_OR_RETURN');
  assert.equal(hypothermiaDec.requiresEarthIntervention, true);
  assert.equal(hypothermiaDec.evaCleared, false);
  assert.equal(hypothermiaDec.returnToGravityReady, false);

  // 2) PA diastólica < 50 mmHg -> LEVEL_3
  const lowDbpVitals = { bp_systolic: 96, bp_diastolic: 48 };
  const lowDbpEval = evaluateHealth(lowDbpVitals);
  const lowDbpDec = evaluateNasaOperationalDecision(lowDbpVitals, lowDbpEval);
  assert.equal(lowDbpDec.triageLevel, 'LEVEL_3_MISSION_ABORT_OR_RETURN');
  assert.equal(lowDbpDec.requiresEarthIntervention, true);
  assert.equal(lowDbpDec.evaCleared, false);
  assert.equal(lowDbpDec.returnToGravityReady, false);

  // 3) HR = 125 en EVA o standing_tilt NO dispara LEVEL_3
  const evaContext = { activityState: 'eva' as const };
  const evaEval = evaluateHealth({ heart_rate: 125 }, { context: evaContext });
  const evaDec = evaluateNasaOperationalDecision({ heart_rate: 125 }, evaEval, evaContext);
  assert.notEqual(evaDec.triageLevel, 'LEVEL_3_MISSION_ABORT_OR_RETURN');
  assert.equal(evaDec.triageLevel, 'LEVEL_2_EARTH_INTERVENTION');

  const tiltContext = { posture: 'standing_tilt' as const };
  const tiltEval = evaluateHealth({ heart_rate: 125 }, { context: tiltContext });
  const tiltDec = evaluateNasaOperationalDecision({ heart_rate: 125 }, tiltEval, tiltContext);
  assert.notEqual(tiltDec.triageLevel, 'LEVEL_3_MISSION_ABORT_OR_RETURN');
  assert.equal(tiltDec.triageLevel, 'LEVEL_2_EARTH_INTERVENTION');

  // 4) LEVEL_2 con overallStatus === 'RED' (temp: 38.1 °C, aunque cardio dé GO_FOR_LANDING) => returnToGravityReady === false
  const feverRedVitals = {
    temperature: 38.1,
    heart_rate: 64,
    bp_systolic: 115,
    bp_diastolic: 75,
  };
  const feverRedEval = evaluateHealth(feverRedVitals);
  assert.equal(feverRedEval.overallStatus, 'RED');
  const feverRedDec = evaluateNasaOperationalDecision(feverRedVitals, feverRedEval);
  assert.equal(feverRedDec.triageLevel, 'LEVEL_2_EARTH_INTERVENTION');
  assert.equal(feverRedDec.gravitySimulation.verdict, 'GO_FOR_LANDING');
  assert.equal(feverRedDec.returnToGravityReady, false);
});
