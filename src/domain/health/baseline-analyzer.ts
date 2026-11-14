import type { ObservationContext } from '../nasa/nasa-types';
import type { NumericVitalKey, PriorObservationInput } from './context-specs';

export type BaselineConfidence = 'insufficient' | 'provisional' | 'established';
export type TrendDirection = 'rising' | 'falling' | 'stable';

export interface IndicatorBaseline {
  key: NumericVitalKey;
  n: number;
  median: number | null;
  iqr: number | null;
  mad: number | null;
  confidence: BaselineConfidence;
  provisional: boolean;
  deltaFromMedian: number | null;
  robustZ: number | null;
  significantDrift: boolean;
  trendDirection: TrendDirection;
  summaryText: string | null;
}

export type BaselineMap = Partial<Record<NumericVitalKey, IndicatorBaseline>>;

const NUMERIC_KEYS: NumericVitalKey[] = [
  'sleep_hours',
  'heart_rate',
  'bp_systolic',
  'bp_diastolic',
  'glucose',
  'temperature',
];

const MIN_ROBUST_SCALE: Record<NumericVitalKey, number> = {
  heart_rate: 6,
  bp_systolic: 8,
  bp_diastolic: 6,
  temperature: 0.25,
  glucose: 8,
  sleep_hours: 0.6,
};

const TREND_MIN_DELTA: Record<NumericVitalKey, number> = {
  heart_rate: 8,
  bp_systolic: 10,
  bp_diastolic: 6,
  temperature: 0.4,
  glucose: 12,
  sleep_hours: 0.8,
};

function computeMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeQuantiles(values: number[]): { median: number; iqr: number; mad: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const median = computeMedian(sorted);
  const half = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, half);
  const upper = sorted.slice(sorted.length % 2 === 0 ? half : half + 1);
  const q1 = lower.length > 0 ? computeMedian(lower) : median;
  const q3 = upper.length > 0 ? computeMedian(upper) : median;
  const absDevs = sorted.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
  return {
    median: Number(median.toFixed(2)),
    iqr: Number((q3 - q1).toFixed(2)),
    mad: Number(computeMedian(absDevs).toFixed(2)),
  };
}

function isComparableForBaseline(
  obs: PriorObservationInput,
  key: NumericVitalKey,
  currentContext: ObservationContext
): boolean {
  if (obs.overallStatus === 'RED') return false;
  const ctx = obs.context;
  if (!ctx) return true;
  if (key === 'heart_rate' || key === 'bp_systolic' || key === 'bp_diastolic') {
    const priorActive = ctx.activityState && ctx.activityState !== 'rest';
    const priorStanding = ctx.posture === 'standing_tilt';
    if (currentContext.activityState === 'rest' && (priorActive || priorStanding)) {
      return false;
    }
  }
  if (key === 'glucose' && currentContext.glucoseTiming === 'fasting') {
    if (ctx.glucoseTiming === 'post_meal') return false;
  }
  return true;
}

function detectTrend(series: number[], key: NumericVitalKey): TrendDirection {
  if (series.length < 3) return 'stable';
  const lastThree = series.slice(-3);
  const span = lastThree[2] - lastThree[0];
  const minDelta = TREND_MIN_DELTA[key];
  if (lastThree[2] >= lastThree[1] && lastThree[1] >= lastThree[0] && span >= minDelta) {
    return 'rising';
  }
  if (lastThree[2] <= lastThree[1] && lastThree[1] <= lastThree[0] && span <= -minDelta) {
    return 'falling';
  }
  return 'stable';
}

export function analyzePersonalBaselines(
  currentVitals: Partial<Record<NumericVitalKey, number | null>>,
  currentContext: ObservationContext,
  priorObservations: PriorObservationInput[] = []
): BaselineMap {
  const result: BaselineMap = {};

  for (const key of NUMERIC_KEYS) {
    const current = currentVitals[key];
    if (typeof current !== 'number' || !Number.isFinite(current)) continue;

    const cleanHistory = priorObservations
      .filter((obs) => isComparableForBaseline(obs, key, currentContext))
      .map((obs) => obs.vitals[key])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

    if (cleanHistory.length === 0) {
      result[key] = {
        key,
        n: 0,
        median: null,
        iqr: null,
        mad: null,
        confidence: 'insufficient',
        provisional: true,
        deltaFromMedian: null,
        robustZ: null,
        significantDrift: false,
        trendDirection: 'stable',
        summaryText: 'Sin historial previo comparable para referencia personal.',
      };
      continue;
    }

    const { median, iqr, mad } = computeQuantiles(cleanHistory);
    const n = cleanHistory.length;
    const confidence: BaselineConfidence =
      n >= 7 ? 'established' : n >= 3 ? 'provisional' : 'insufficient';
    const delta = Number((current - median).toFixed(2));
    const scale = Math.max(mad * 1.4826, MIN_ROBUST_SCALE[key]);
    const robustZ = Number((delta / scale).toFixed(2));
    const significantDrift = n >= 3 && Math.abs(robustZ) >= 2.5;
    const trendDirection = detectTrend([...cleanHistory, current], key);

    const sign = delta > 0 ? '+' : '';
    const summaryText = `Base personal ${confidence === 'established' ? 'estable' : confidence === 'provisional' ? 'provisional' : 'inicial'} (n=${n}): mediana ${median}, IQR ${iqr}, delta ${sign}${delta}.`;

    result[key] = {
      key,
      n,
      median,
      iqr,
      mad,
      confidence,
      provisional: n < 7,
      deltaFromMedian: delta,
      robustZ,
      significantDrift,
      trendDirection,
      summaryText,
    };
  }

  return result;
}
