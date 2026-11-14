import { STATUS, type ConclusionCard, type HealthStatus, type ScorePenalty, type VitalValues } from './vital-specs';

const MOOD_PENALTIES: Record<VitalValues['mood'], number> = {
  excelente: 0,
  bien: 2,
  cansado: 8,
  estresado: 12,
  agotado: 20,
};

/**
 * Calcula un índice orientativo de bienestar (0-100) con desglose transparente de penalizaciones.
 */
export function computeWellnessIndex(
  v: VitalValues,
  overallStatus: HealthStatus,
  crossConclusion: ConclusionCard
): { readinessScore: number; scoreBreakdown: ScorePenalty[] } {
  const breakdown: ScorePenalty[] = [];
  const addPenalty = (factor: string, detail: string, points: number) => {
    if (points > 0) {
      breakdown.push({ factor, detail, penalty: Math.round(points * 10) / 10 });
    }
  };

  if (v.sleep_hours < 7) addPenalty('Sueño', `${v.sleep_hours.toFixed(1)} h (< 7.0 h)`, (7 - v.sleep_hours) * 6);
  else if (v.sleep_hours > 10) addPenalty('Sueño', `${v.sleep_hours.toFixed(1)} h (> 10.0 h)`, (v.sleep_hours - 10) * 2);

  addPenalty('Ánimo', `Estado '${v.mood}'`, MOOD_PENALTIES[v.mood] || 0);

  if (v.heart_rate > 80) addPenalty('Pulso', `${v.heart_rate} BPM (> 80 BPM)`, (v.heart_rate - 80) * 0.5);
  else if (v.heart_rate < 60) addPenalty('Pulso', `${v.heart_rate} BPM (< 60 BPM)`, (60 - v.heart_rate) * 0.8);

  if (v.bp_systolic > 120) addPenalty('Presión sistólica', `${v.bp_systolic} mmHg (> 120)`, (v.bp_systolic - 120) * 0.45);
  else if (v.bp_systolic < 105) addPenalty('Presión sistólica', `${v.bp_systolic} mmHg (< 105)`, (105 - v.bp_systolic) * 0.8);

  if (v.bp_diastolic > 80) addPenalty('Presión diastólica', `${v.bp_diastolic} mmHg (> 80)`, (v.bp_diastolic - 80) * 0.5);
  else if (v.bp_diastolic < 65) addPenalty('Presión diastólica', `${v.bp_diastolic} mmHg (< 65)`, (65 - v.bp_diastolic) * 0.8);

  if (v.glucose > 95) addPenalty('Glucosa', `${v.glucose} mg/dL (> 95)`, (v.glucose - 95) * 0.35);
  else if (v.glucose < 75) addPenalty('Glucosa', `${v.glucose} mg/dL (< 75)`, (75 - v.glucose) * 0.8);

  if (v.temperature > 37.0) addPenalty('Temperatura', `${v.temperature.toFixed(1)} °C (> 37.0 °C)`, (v.temperature - 37.0) * 14);
  else if (v.temperature < 36.2) addPenalty('Temperatura', `${v.temperature.toFixed(1)} °C (< 36.2 °C)`, (36.2 - v.temperature) * 14);

  if (crossConclusion.status === STATUS.RED) addPenalty('Severidad clínica', `Conclusión crítica (${crossConclusion.title})`, 10);
  else if (crossConclusion.status === STATUS.YELLOW) addPenalty('Severidad clínica', `Conclusión de precaución (${crossConclusion.title})`, 5);

  const totalPenalty = breakdown.reduce((acc, item) => acc + item.penalty, 0);
  const rawScore = Math.round(100 - totalPenalty);

  let readinessScore: number;
  if (overallStatus === STATUS.GREEN) readinessScore = Math.min(100, Math.max(80, rawScore));
  else if (overallStatus === STATUS.YELLOW) readinessScore = Math.min(79, Math.max(50, rawScore));
  else readinessScore = Math.min(49, Math.max(15, rawScore));

  return { readinessScore, scoreBreakdown: breakdown };
}
