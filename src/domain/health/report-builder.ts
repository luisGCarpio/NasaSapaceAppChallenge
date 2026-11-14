import { ALGORITHM_VERSION, STATUS, type ConclusionCard, type HealthStatus, type VitalValues } from './vital-specs';

/**
 * Genera el texto estructurado del reporte para copiar al portapapeles y registrar en bitácora local.
 */
export function buildCommsMessage(
  v: VitalValues,
  overallStatus: HealthStatus,
  readinessScore: number,
  crossConclusion: ConclusionCard
): string {
  const statusTag =
    overallStatus === STATUS.GREEN ? 'ÓPTIMO' : overallStatus === STATUS.YELLOW ? 'CUIDADO' : 'PELIGRO';
  return (
    `Reporte de Autoevaluación A.R.E.S. Pulse [${statusTag} - Índice ${readinessScore}/100 | v${ALGORITHM_VERSION}]: ` +
    `${crossConclusion.title}. ` +
    `Valores ingresados: Pulso ${v.heart_rate} BPM, Presión ${v.bp_systolic}/${v.bp_diastolic} mmHg, ` +
    `Glucosa ${v.glucose} mg/dL, Temp ${v.temperature.toFixed(1)} °C, Sueño ${v.sleep_hours.toFixed(1)} h, Ánimo ${v.mood}. ` +
    `Acción recomendada: ${crossConclusion.actionText}.`
  );
}
