import type { ObservationContext } from '../nasa/nasa-types';
import { STATUS, type HealthStatus, type VitalValues } from './vital-specs';

export type ScenarioId = 'nominal' | 'warning' | 'critical';

export const SCENARIOS: Record<ScenarioId, VitalValues> = {
  nominal: {
    sleep_hours: 8.0,
    mood: 'excelente',
    heart_rate: 68,
    bp_systolic: 115,
    bp_diastolic: 75,
    glucose: 88,
    temperature: 36.6,
  },
  warning: {
    sleep_hours: 5.8,
    mood: 'cansado',
    heart_rate: 88,
    bp_systolic: 128,
    bp_diastolic: 82,
    glucose: 118,
    temperature: 37.0,
  },
  critical: {
    sleep_hours: 4.5,
    mood: 'agotado',
    heart_rate: 122,
    bp_systolic: 86,
    bp_diastolic: 54,
    glucose: 64,
    temperature: 38.4,
  },
};

export interface ScenarioMetadata {
  id: ScenarioId;
  label: string;
  status: HealthStatus;
  description: string;
  provenance: 'synthetic_simulation';
  context: ObservationContext;
  vitals: VitalValues;
}

export const SCENARIOS_META: Record<ScenarioId, ScenarioMetadata> = {
  nominal: {
    id: 'nominal',
    label: 'Simulación: Protocolo Nominal',
    status: STATUS.GREEN,
    description: 'Simulación sintética de entrenamiento en reposo dentro de rangos óptimos.',
    provenance: 'synthetic_simulation',
    context: {
      activityState: 'rest',
      posture: 'seated',
      glucoseTiming: 'fasting',
      tempMethod: 'oral',
      confirmedRepeated: true,
      symptoms: [],
    },
    vitals: { ...SCENARIOS.nominal },
  },
  warning: {
    id: 'warning',
    label: 'Simulación: Alerta Preventiva',
    status: STATUS.YELLOW,
    description: 'Simulación sintética con sueño reducido, presión limítrofe y glucemia en ayunas elevada.',
    provenance: 'synthetic_simulation',
    context: {
      activityState: 'rest',
      posture: 'seated',
      glucoseTiming: 'fasting',
      tempMethod: 'oral',
      confirmedRepeated: false,
      symptoms: ['Fatiga severa'],
    },
    vitals: { ...SCENARIOS.warning },
  },
  critical: {
    id: 'critical',
    label: 'Simulación: Prioridad Médica Alta',
    status: STATUS.RED,
    description: 'Simulación sintética crítica (fiebre >=38°C, taquicardia, hipotensión e hipoglucemia).',
    provenance: 'synthetic_simulation',
    context: {
      activityState: 'rest',
      posture: 'seated',
      glucoseTiming: 'fasting',
      tempMethod: 'oral',
      confirmedRepeated: true,
      symptoms: ['Mareo ortostático', 'Fiebre / escalofríos'],
    },
    vitals: { ...SCENARIOS.critical },
  },
};
