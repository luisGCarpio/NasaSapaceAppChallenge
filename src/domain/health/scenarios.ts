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
    heart_rate: 112,
    bp_systolic: 90,
    bp_diastolic: 58,
    glucose: 132,
    temperature: 38.2,
  },
};

export interface ScenarioMetadata {
  id: ScenarioId;
  label: string;
  status: HealthStatus;
  description: string;
  vitals: VitalValues;
}

export const SCENARIOS_META: Record<ScenarioId, ScenarioMetadata> = {
  nominal: {
    id: 'nominal',
    label: 'Escenario Nominal',
    status: STATUS.GREEN,
    description: 'Simulación con indicadores dentro de rangos de referencia.',
    vitals: { ...SCENARIOS.nominal },
  },
  warning: {
    id: 'warning',
    label: 'Escenario Precaución',
    status: STATUS.YELLOW,
    description: 'Simulación con sueño justo, pulso levemente alto y glucosa elevada.',
    vitals: { ...SCENARIOS.warning },
  },
  critical: {
    id: 'critical',
    label: 'Escenario Crítico',
    status: STATUS.RED,
    description: 'Simulación con taquicardia, hipotensión relativa, fiebre y fatiga severa.',
    vitals: { ...SCENARIOS.critical },
  },
};
