import {
  ACTIONS,
  REFERENCES,
  STATUS,
  STATUS_LABELS,
  STATUS_RANK,
  type ActionRecommendation,
  type ConclusionCard,
  type HealthStatus,
  type ScientificReference,
  type SystemEvaluation,
  type SystemId,
  type VitalValues,
} from './vital-specs';

interface MatchedCross {
  priority: number;
  card: ConclusionCard;
}

function makeCrossCard(
  id: string,
  status: HealthStatus,
  title: string,
  message: string,
  action: ActionRecommendation,
  reasons: string[],
  reference: ScientificReference
): ConclusionCard {
  return {
    id,
    status,
    label: STATUS_LABELS[status],
    title,
    message,
    actionIcon: action.actionIcon,
    actionText: action.actionText,
    reasons,
    reference,
  };
}

function systemFallback(id: string, sys: SystemEvaluation): ConclusionCard {
  return makeCrossCard(
    id,
    sys.status,
    sys.title,
    sys.message,
    { actionIcon: sys.actionIcon, actionText: sys.actionText },
    sys.reasons,
    sys.reference
  );
}

export function getWorstStatus(statuses: readonly HealthStatus[]): HealthStatus {
  return statuses.reduce<HealthStatus>(
    (worst, current) => (STATUS_RANK[current] > STATUS_RANK[worst] ? current : worst),
    STATUS.GREEN
  );
}

/**
 * Evalúa los cruces fisiológicos respetando estrictamente la máxima severidad detectada.
 */
export function evaluateCrosses(
  v: VitalValues,
  systems: Record<SystemId, SystemEvaluation>
): { crossConclusion: ConclusionCard; triggeredCrosses: ConclusionCard[] } {
  const matched: MatchedCross[] = [];

  if (v.heart_rate > 95 && v.bp_systolic < 95) {
    matched.push({
      priority: 1,
      card: makeCrossCard(
        'dehydration',
        STATUS.RED,
        'Riesgo de deshidratación e hipotensión',
        'Pulso elevado (> 95 BPM) y presión sistólica baja (< 95 mmHg) sugieren menor volumen circulante. Hidrátate, evita incorporarte rápido y notifica al equipo.',
        ACTIONS.HYDRATE,
        [`Frecuencia cardíaca: ${v.heart_rate} BPM (> 95 BPM).`, `Presión sistólica: ${v.bp_systolic} mmHg (< 95 mmHg).`],
        REFERENCES.HEART
      ),
    });
  }

  if (v.temperature >= 37.7 && (v.heart_rate > 90 || ['cansado', 'estresado', 'agotado'].includes(v.mood))) {
    matched.push({
      priority: 2,
      card: makeCrossCard(
        'immune_fever',
        STATUS.RED,
        'Fiebre acompañada de fatiga o taquicardia',
        'Temperatura febril (>= 37.7 °C) junto con aumento de pulso o fatiga marcada. Guarda reposo, mantén hidratación y solicita valoración médica.',
        ACTIONS.COMMS,
        [
          `Temperatura: ${v.temperature.toFixed(1)} °C (>= 37.7 °C).`,
          v.heart_rate > 90 ? `Frecuencia cardíaca: ${v.heart_rate} BPM (> 90 BPM).` : `Ánimo reportado: ${v.mood}.`,
        ],
        REFERENCES.BODY
      ),
    });
  }

  if (v.sleep_hours < 6 && (['estresado', 'agotado'].includes(v.mood) || v.bp_systolic > 130)) {
    const isRed = v.sleep_hours < 5.5 || v.bp_systolic >= 140 || v.mood === 'agotado';
    matched.push({
      priority: 3,
      card: makeCrossCard(
        'fatigue_overload',
        isRed ? STATUS.RED : STATUS.YELLOW,
        'Fatiga acumulada y carga tensional',
        'La restricción de sueño coincide con tensión subjetiva o presión arterial elevada. Prioriza recuperación antes de tareas complejas.',
        ACTIONS.SLEEP,
        [
          `Sueño: ${v.sleep_hours.toFixed(1)} h (< 6.0 h).`,
          v.bp_systolic > 130 ? `Presión sistólica: ${v.bp_systolic} mmHg (> 130 mmHg).` : `Ánimo reportado: ${v.mood}.`,
        ],
        REFERENCES.MIND
      ),
    });
  }

  if (v.glucose >= 105) {
    const isRed = v.glucose > 125;
    matched.push({
      priority: 4,
      card: makeCrossCard(
        'microgravity_glucose',
        isRed ? STATUS.RED : STATUS.YELLOW,
        isRed ? 'Glucosa significativamente elevada' : 'Glucosa moderadamente elevada',
        isRed
          ? 'Glucosa superior a 125 mg/dL. Confirma horario de última comida, mantén hidratación y consulta con soporte médico.'
          : 'Glucosa >= 105 mg/dL. Si no existe ninguna alerta roja cardiovascular o febril, realizar ejercicio suave ayuda a metabolizarla.',
        isRed ? ACTIONS.COMMS : ACTIONS.EXERCISE,
        [`Glucosa: ${v.glucose} mg/dL (${isRed ? '> 125' : '>= 105'} mg/dL).`],
        REFERENCES.BODY
      ),
    });
  }

  matched.sort((a, b) => STATUS_RANK[b.card.status] - STATUS_RANK[a.card.status] || a.priority - b.priority);
  const triggeredCrosses = matched.map((item) => item.card);

  const systemWorst = getWorstStatus([systems.mind.status, systems.heart.status, systems.body.status]);
  const crossWorst = triggeredCrosses.length > 0 ? triggeredCrosses[0].status : STATUS.GREEN;
  const maxSeverity = getWorstStatus([systemWorst, crossWorst]);

  const topMatch = matched.find((item) => item.card.status === maxSeverity);
  if (topMatch) {
    return { crossConclusion: topMatch.card, triggeredCrosses };
  }

  if (maxSeverity === STATUS.RED) {
    if (systems.heart.status === STATUS.RED && systems.body.status === STATUS.RED) {
      return {
        crossConclusion: makeCrossCard(
          'general_red',
          STATUS.RED,
          'Alerta combinada en circulación y metabolismo',
          'Existen indicadores críticos en sistema cardiovascular y corporal. Suspende actividad física exigente y avisa al equipo médico.',
          ACTIONS.COMMS,
          [...systems.heart.reasons, ...systems.body.reasons],
          REFERENCES.HEART
        ),
        triggeredCrosses,
      };
    }
    if (systems.heart.status === STATUS.RED) return { crossConclusion: systemFallback('heart_red', systems.heart), triggeredCrosses };
    if (systems.body.status === STATUS.RED) return { crossConclusion: systemFallback('body_red', systems.body), triggeredCrosses };
    return { crossConclusion: systemFallback('mind_red', systems.mind), triggeredCrosses };
  }

  const yellowSystems = [systems.mind, systems.heart, systems.body].filter((s) => s.status === STATUS.YELLOW);
  if (maxSeverity === STATUS.YELLOW && yellowSystems.length > 0) {
    if (yellowSystems.length > 1) {
      return {
        crossConclusion: makeCrossCard(
          'multi_yellow',
          STATUS.YELLOW,
          'Múltiples indicadores en rango de precaución',
          'Más de un sistema muestra valores fuera de su zona óptima. Reduce carga de trabajo, hidrátate y descansa en la próxima pausa.',
          ACTIONS.HYDRATE,
          yellowSystems.flatMap((s) => s.reasons),
          REFERENCES.CSA
        ),
        triggeredCrosses,
      };
    }
    const only = yellowSystems[0];
    return { crossConclusion: systemFallback(`${only.systemId}_yellow`, only), triggeredCrosses };
  }

  return {
    crossConclusion: makeCrossCard(
      'nominal',
      STATUS.GREEN,
      'Indicadores dentro de rangos nominales',
      'Las seis variables ingresadas se encuentran en equilibrio. Mantén tu rutina de hidratación, descanso y ejercicio diario.',
      ACTIONS.EXERCISE,
      ['Todos los sistemas evaluados están en banda verde (óptima).'],
      REFERENCES.CSA
    ),
    triggeredCrosses,
  };
}
