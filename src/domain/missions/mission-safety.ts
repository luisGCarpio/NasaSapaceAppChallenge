import type { HealthEvaluation } from '../health/vital-specs';

export interface MissionSafetyOverlay {
  blockedByRestriction: boolean;
  restrictionReason: string | null;
  recommendedPriority: boolean;
}

export function applyClinicalRestrictionsToMissions<T extends { id: string }>(
  missions: T[],
  evaluation?: HealthEvaluation | null
): (T & MissionSafetyOverlay)[] {
  const restrictExercise = Boolean(evaluation?.clinicalRestrictions?.restrictStrenuousExercise);
  const restrictionReasons = evaluation?.clinicalRestrictions?.reasons ?? [];
  const overall = evaluation?.overallStatus;
  const mindNonGreen = evaluation?.systems?.mind?.status && evaluation.systems.mind.status !== 'GREEN';

  return missions.map((mission) => {
    if (mission.id === 'exercise' && restrictExercise) {
      return {
        ...mission,
        blockedByRestriction: true,
        restrictionReason:
          restrictionReasons.length > 0
            ? `Pausada por seguridad clínica: ${restrictionReasons.join(' ')}`
            : 'Pausada por alerta clínica activa.',
        recommendedPriority: false,
      };
    }

    const prioritizeRest = mission.id === 'rest' && (overall === 'RED' || mindNonGreen);
    const prioritizeHydrate =
      mission.id === 'hydrate' &&
      (overall === 'RED' || evaluation?.crossConclusionId === 'orthostatic_fluid_strain');

    return {
      ...mission,
      blockedByRestriction: false,
      restrictionReason: null,
      recommendedPriority: Boolean(prioritizeRest || prioritizeHydrate),
    };
  });
}
