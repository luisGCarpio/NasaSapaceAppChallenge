import type { CoverageSummary } from './context-specs';
import {
  ConclusionCard,
  HealthStatus,
  PartialVitalValues,
  STATUS,
  ScorePenalty,
  SystemEvaluation,
  SystemId,
} from './vital-specs';

export interface WellnessScoreResult {
  score: number | null;
  confidence: 'high' | 'partial' | 'insufficient';
  breakdown: ScorePenalty[];
}

export function computeWellnessIndex(opts: {
  vitals: PartialVitalValues;
  systems: Record<SystemId, SystemEvaluation>;
  overallStatus: HealthStatus;
  triggeredCrosses: ConclusionCard[];
  coverage: CoverageSummary;
}): WellnessScoreResult {
  const { vitals, systems, overallStatus, triggeredCrosses, coverage } = opts;

  if (overallStatus === STATUS.INSUFFICIENT_DATA || coverage.presentCount < 2) {
    return {
      score: null,
      confidence: 'insufficient',
      breakdown: coverage.presentCount === 1
        ? [{ factor: 'Cobertura mínima', detail: 'Solo 1 indicador medido; índice compuesto omitido', penalty: 0 }]
        : [],
    };
  }

  let score = 100;
  const breakdown: ScorePenalty[] = [];

  for (const sys of Object.values(systems)) {
    if (sys.status === STATUS.RED) {
      const pts = sys.systemId === 'heart' ? 35 : sys.systemId === 'body' ? 30 : 25;
      score -= pts;
      breakdown.push({ factor: sys.systemName, detail: sys.title, penalty: -pts });
    } else if (sys.status === STATUS.YELLOW) {
      const pts = sys.systemId === 'heart' ? 16 : 12;
      score -= pts;
      breakdown.push({ factor: sys.systemName, detail: sys.title, penalty: -pts });
    }
  }

  if (triggeredCrosses.length > 0) {
    const crossPts = triggeredCrosses[0].status === STATUS.RED ? 15 : 8;
    score -= crossPts;
    breakdown.push({ factor: 'Correlación cruzada', detail: triggeredCrosses[0].title, penalty: -crossPts });
  }

  if (typeof vitals.sleep_hours === 'number' && vitals.sleep_hours < 7.0 && systems.mind.status === STATUS.GREEN) {
    score -= 4;
    breakdown.push({ factor: 'Sueño', detail: `${vitals.sleep_hours} h (< 7.0 h)`, penalty: -4 });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (overallStatus === STATUS.GREEN) score = Math.max(80, Math.min(100, score));
  else if (overallStatus === STATUS.YELLOW) score = Math.max(50, Math.min(79, score));
  else if (overallStatus === STATUS.RED) score = Math.max(15, Math.min(49, score));

  return {
    score,
    confidence: coverage.presentCount >= 5 && coverage.missingIndicators.length <= 2 ? 'high' : 'partial',
    breakdown,
  };
}
