import { evaluateHealth } from '../health';
import type { PriorObservationInput } from '../health/context-specs';
import { applyClinicalRestrictionsToMissions } from '../missions/mission-safety';
import type { NasaResearchObservation, NasaStudyId } from './nasa-types';

export interface BenchmarkMetrics {
  engineVersion: string;
  totalObservationsEvaluated: number;
  withQuantitativeVitals: number;
  qualitativeSymptomsOnly: number;
  v2EvaluableCount: number;
  v2CoverageRatePct: number;
  v3EvaluableCount: number;
  v3CoverageRatePct: number;
  v3AlertsDetected: {
    red: number;
    yellow: number;
    green: number;
    insufficientData: number;
  };
  tiltWithHr100PlusTotal: number;
  tiltClassifiedAsOrthostaticNotRestPanic: number;
  unknownGlucose100to139Count: number;
  unknownGlucoseFlaggedContextualConfirmation: number;
  observationsWithExerciseRestriction: number;
  missionVsClinicalConflictsV2: number;
  missionVsClinicalConflictsV3: number;
  sampleRecoveredAlerts: {
    observationId: string;
    subjectId: string;
    studyId: NasaStudyId;
    relativeLabel: string;
    v2Status: string;
    v3Status: string;
    v3Title: string;
    baselineText: string | null;
  }[];
}

const REQUIRED_7_KEYS = [
  'mood',
  'sleep_hours',
  'heart_rate',
  'bp_systolic',
  'bp_diastolic',
  'temperature',
  'glucose',
] as const;

export function runRetrospectiveNasaBenchmark(
  observations: NasaResearchObservation[]
): BenchmarkMetrics {
  const bySubject = new Map<string, PriorObservationInput[]>();

  let withVitals = 0;
  let qualitativeOnly = 0;
  let v2EvaluableCount = 0;
  let v3EvaluableCount = 0;

  let red = 0;
  let yellow = 0;
  let green = 0;
  let insufficientData = 0;

  let tiltWithHr100PlusTotal = 0;
  let tiltClassifiedAsOrthostaticNotRestPanic = 0;
  let unknownGlucose100to139Count = 0;
  let unknownGlucoseFlaggedContextualConfirmation = 0;
  let observationsWithExerciseRestriction = 0;
  let missionVsClinicalConflictsV2 = 0;
  let missionVsClinicalConflictsV3 = 0;

  const sampleRecoveredAlerts: BenchmarkMetrics['sampleRecoveredAlerts'] = [];

  for (const obs of observations) {
    const hasAnyVital = Object.values(obs.vitals).some((v) => typeof v === 'number');
    if (!hasAnyVital) {
      qualitativeOnly++;
      insufficientData++;
      continue;
    }

    withVitals++;

    // Legacy v2.0.0 strict completeness requirement: rejected any row missing any of 7 indicators
    const hasAll7 = REQUIRED_7_KEYS.every((k) =>
      k === 'mood' ? Boolean(obs.vitals.mood) : typeof obs.vitals[k] === 'number'
    );
    if (hasAll7) v2EvaluableCount++;

    const history = bySubject.get(obs.subjectId) ?? [];
    const evalRes = evaluateHealth(obs.vitals, {
      context: obs.context,
      priorObservations: history,
    });

    if (evalRes.valid) v3EvaluableCount++;

    if (evalRes.overallStatus === 'RED') red++;
    else if (evalRes.overallStatus === 'YELLOW') yellow++;
    else if (evalRes.overallStatus === 'GREEN') green++;
    else insufficientData++;

    if (
      obs.studyId === 'MR001G_C3_TILT' &&
      obs.context.posture === 'standing_tilt' &&
      (obs.vitals.heart_rate ?? 0) > 100
    ) {
      tiltWithHr100PlusTotal++;
      const hasOrthostaticTrace = evalRes.ruleTraces.some(
        (t) => t.ruleId === 'HEART_HR_ORTHOSTATIC_TILT' || t.ruleId === 'CROSS_ORTHOSTATIC_STRAIN'
      );
      if (hasOrthostaticTrace) tiltClassifiedAsOrthostaticNotRestPanic++;
    }

    if (
      obs.context.glucoseTiming === 'unknown' &&
      typeof obs.vitals.glucose === 'number' &&
      obs.vitals.glucose >= 100 &&
      obs.vitals.glucose <= 139
    ) {
      unknownGlucose100to139Count++;
      if (evalRes.systems.body.status === 'GREEN') {
        unknownGlucoseFlaggedContextualConfirmation++;
      }
    }

    if (evalRes.clinicalRestrictions.restrictStrenuousExercise) {
      observationsWithExerciseRestriction++;
      // In v2.0.0, BASE_MISSIONS always offered `exercise` unconditionally without clinical gate
      missionVsClinicalConflictsV2++;
      const checkedMissions = applyClinicalRestrictionsToMissions(
        [{ id: 'exercise' }],
        evalRes
      );
      if (!checkedMissions[0].blockedByRestriction) {
        missionVsClinicalConflictsV3++;
      }
    }

    if (
      !hasAll7 &&
      evalRes.overallStatus === 'RED' &&
      sampleRecoveredAlerts.length < 8
    ) {
      const hrBase = evalRes.baselines.heart_rate?.summaryText ?? null;
      const tempBase = evalRes.baselines.temperature?.summaryText ?? null;
      sampleRecoveredAlerts.push({
        observationId: obs.observationId,
        subjectId: obs.subjectId,
        studyId: obs.studyId,
        relativeLabel: obs.relativeLabel,
        v2Status: 'INSUFFICIENT_DATA (bloqueado por falta de 7/7)',
        v3Status: evalRes.overallStatus,
        v3Title: evalRes.crossConclusion.title,
        baselineText: hrBase ?? tempBase ?? evalRes.baselines.glucose?.summaryText ?? null,
      });
    }

    // Causal append AFTER evaluation so baseline only ever sees past observations
    history.push({
      observationId: obs.observationId,
      sortOrder: obs.sortOrder,
      overallStatus: evalRes.overallStatus,
      vitals: obs.vitals,
      context: obs.context,
    });
    bySubject.set(obs.subjectId, history);
  }

  return {
    engineVersion: '3.0.0',
    totalObservationsEvaluated: observations.length,
    withQuantitativeVitals: withVitals,
    qualitativeSymptomsOnly: qualitativeOnly,
    v2EvaluableCount,
    v2CoverageRatePct: withVitals > 0 ? Number(((v2EvaluableCount / withVitals) * 100).toFixed(1)) : 0,
    v3EvaluableCount,
    v3CoverageRatePct: withVitals > 0 ? Number(((v3EvaluableCount / withVitals) * 100).toFixed(1)) : 0,
    v3AlertsDetected: { red, yellow, green, insufficientData },
    tiltWithHr100PlusTotal,
    tiltClassifiedAsOrthostaticNotRestPanic,
    unknownGlucose100to139Count,
    unknownGlucoseFlaggedContextualConfirmation,
    observationsWithExerciseRestriction,
    missionVsClinicalConflictsV2,
    missionVsClinicalConflictsV3,
    sampleRecoveredAlerts,
  };
}
