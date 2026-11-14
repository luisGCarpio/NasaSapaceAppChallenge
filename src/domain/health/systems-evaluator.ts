import {
  ACTIONS,
  REFERENCES,
  STATUS,
  STATUS_LABELS,
  type ActionRecommendation,
  type HealthStatus,
  type ScientificReference,
  type SystemEvaluation,
  type SystemId,
  type VitalValues,
} from './vital-specs';

function makeSystemCard(
  systemId: SystemId,
  systemName: string,
  systemIcon: 'brain' | 'heart' | 'shield',
  status: HealthStatus,
  title: string,
  message: string,
  action: ActionRecommendation,
  reasons: string[],
  reference: ScientificReference
): SystemEvaluation {
  return {
    systemId,
    systemName,
    systemIcon,
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

export function evaluateMind(v: VitalValues): SystemEvaluation {
  const reasons: string[] = [];
  if (v.sleep_hours < 5.5) reasons.push(`Sueño: ${v.sleep_hours.toFixed(1)} h (umbral crítico < 5.5 h).`);
  else if (v.sleep_hours < 7.0) reasons.push(`Sueño: ${v.sleep_hours.toFixed(1)} h (debajo del óptimo 7.0-9.0 h).`);
  else if (v.sleep_hours > 10.0) reasons.push(`Sueño prolongado: ${v.sleep_hours.toFixed(1)} h (> 10.0 h).`);
  else reasons.push(`Sueño: ${v.sleep_hours.toFixed(1)} h (rango óptimo 7.0-9.0 h).`);

  if (v.mood === 'agotado') reasons.push('Ánimo reportado: agotado (umbral crítico de fatiga).');
  else if (v.mood === 'estresado' || v.mood === 'cansado') reasons.push(`Ánimo reportado: ${v.mood} (desgaste moderado).`);
  else reasons.push(`Ánimo reportado: ${v.mood} (estable).`);

  if (v.sleep_hours < 5.5 || v.mood === 'agotado') {
    return makeSystemCard(
      'mind',
      'Mente y Descanso',
      'brain',
      STATUS.RED,
      'Déficit severo de descanso o agotamiento',
      'Tus horas de sueño están por debajo del mínimo operativo o reportaste agotamiento. Evita tareas de alta precisión y prioriza descanso.',
      ACTIONS.SLEEP,
      reasons,
      REFERENCES.MIND
    );
  }
  if (v.sleep_hours >= 7.0 && v.sleep_hours <= 10.0 && (v.mood === 'excelente' || v.mood === 'bien')) {
    return makeSystemCard(
      'mind',
      'Mente y Descanso',
      'brain',
      STATUS.GREEN,
      'Descanso y estado de ánimo estables',
      'Tus horas de sueño y estado subjetivo están dentro del rango recomendado para operar con atención normal.',
      ACTIONS.BREATHE,
      reasons,
      REFERENCES.MIND
    );
  }
  if (v.mood === 'estresado') {
    return makeSystemCard(
      'mind',
      'Mente y Descanso',
      'brain',
      STATUS.YELLOW,
      'Carga de estrés o descanso incompleto',
      'Reportaste estrés o menos sueño del óptimo. Realiza una pausa breve de respiración y organiza descanso antes del siguiente turno.',
      ACTIONS.BREATHE,
      reasons,
      REFERENCES.MIND
    );
  }
  return makeSystemCard(
    'mind',
    'Mente y Descanso',
    'brain',
    STATUS.YELLOW,
    'Descanso por debajo del óptimo',
    'Dormiste menos de 7.0 horas o sientes cansancio moderado. Ajusta tu agenda para recuperar sueño en el próximo periodo.',
    ACTIONS.SLEEP,
    reasons,
    REFERENCES.MIND
  );
}

export function evaluateHeart(v: VitalValues): SystemEvaluation {
  const redReasons: string[] = [];
  const yellowReasons: string[] = [];
  const nominalReasons: string[] = [];

  if (v.heart_rate > 100) redReasons.push(`Frecuencia cardíaca: ${v.heart_rate} BPM (umbral crítico > 100 BPM).`);
  else if (v.heart_rate < 55) redReasons.push(`Frecuencia cardíaca: ${v.heart_rate} BPM (umbral crítico < 55 BPM).`);
  else if (v.heart_rate > 85) yellowReasons.push(`Frecuencia cardíaca: ${v.heart_rate} BPM (elevada 86-100 BPM).`);
  else if (v.heart_rate < 60) yellowReasons.push(`Frecuencia cardíaca: ${v.heart_rate} BPM (baja 55-59 BPM).`);
  else nominalReasons.push(`Frecuencia cardíaca: ${v.heart_rate} BPM (óptimo 60-85 BPM).`);

  if (v.bp_systolic >= 140) redReasons.push(`Presión sistólica: ${v.bp_systolic} mmHg (umbral crítico >= 140 mmHg).`);
  else if (v.bp_systolic < 95) redReasons.push(`Presión sistólica: ${v.bp_systolic} mmHg (umbral crítico < 95 mmHg).`);
  else if (v.bp_systolic >= 126) yellowReasons.push(`Presión sistólica: ${v.bp_systolic} mmHg (elevada 126-139 mmHg).`);
  else if (v.bp_systolic < 100) yellowReasons.push(`Presión sistólica: ${v.bp_systolic} mmHg (límite bajo 95-99 mmHg).`);
  else nominalReasons.push(`Presión sistólica: ${v.bp_systolic} mmHg (óptimo 100-125 mmHg).`);

  if (v.bp_diastolic >= 90) redReasons.push(`Presión diastólica: ${v.bp_diastolic} mmHg (umbral crítico >= 90 mmHg).`);
  else if (v.bp_diastolic < 60) redReasons.push(`Presión diastólica: ${v.bp_diastolic} mmHg (umbral crítico < 60 mmHg).`);
  else if (v.bp_diastolic >= 81) yellowReasons.push(`Presión diastólica: ${v.bp_diastolic} mmHg (elevada 81-89 mmHg).`);
  else if (v.bp_diastolic < 65) yellowReasons.push(`Presión diastólica: ${v.bp_diastolic} mmHg (límite bajo 60-64 mmHg).`);
  else nominalReasons.push(`Presión diastólica: ${v.bp_diastolic} mmHg (óptimo 65-80 mmHg).`);

  if (redReasons.length > 0) {
    const reasons = [...redReasons, ...yellowReasons];
    const isLowBp = v.bp_systolic < 95 || v.bp_diastolic < 60;
    return makeSystemCard(
      'heart',
      'Corazón y Circulación',
      'heart',
      STATUS.RED,
      isLowBp ? 'Hipotensión o caída significativa de presión' : 'Taquicardia o hipertensión en nivel de alerta',
      isLowBp
        ? 'Tu presión arterial está por debajo del rango seguro y puede causar mareo. Permanece apoyado, bebe agua y notifica al equipo médico.'
        : 'Tu pulso o presión arterial superan el umbral de seguridad en reposo. Detén esfuerzos físicos, descansa y notifica al equipo médico.',
      isLowBp ? ACTIONS.HYDRATE : ACTIONS.COMMS,
      reasons,
      REFERENCES.HEART
    );
  }

  if (yellowReasons.length > 0) {
    const reasons = [...yellowReasons, ...nominalReasons];
    const isLow = v.bp_systolic < 100 || v.bp_diastolic < 65 || v.heart_rate < 60;
    return makeSystemCard(
      'heart',
      'Corazón y Circulación',
      'heart',
      STATUS.YELLOW,
      isLow ? 'Pulso o presión ligeramente bajos' : 'Pulso o presión moderadamente elevados',
      isLow
        ? 'Tu circulación está en el límite inferior. Hidrátate bien y cambia de postura de forma gradual.'
        : 'Tu ritmo cardíaco o presión están por encima de tu rango ideal en reposo. Baja el ritmo y realiza respiración pausada.',
      isLow ? ACTIONS.HYDRATE : ACTIONS.BREATHE,
      reasons,
      REFERENCES.HEART
    );
  }

  return makeSystemCard(
    'heart',
    'Corazón y Circulación',
    'heart',
    STATUS.GREEN,
    'Parámetros cardiovasculares en rango óptimo',
    'Tu frecuencia cardíaca y presión arterial están estables dentro de los valores de referencia en reposo.',
    ACTIONS.EXERCISE,
    nominalReasons,
    REFERENCES.HEART
  );
}

export function evaluateBody(v: VitalValues): SystemEvaluation {
  const redReasons: string[] = [];
  const yellowReasons: string[] = [];
  const nominalReasons: string[] = [];

  if (v.temperature >= 37.7) redReasons.push(`Temperatura: ${v.temperature.toFixed(1)} °C (umbral febril >= 37.7 °C).`);
  else if (v.temperature < 35.8) redReasons.push(`Temperatura: ${v.temperature.toFixed(1)} °C (umbral bajo < 35.8 °C).`);
  else if (v.temperature >= 37.3) yellowReasons.push(`Temperatura: ${v.temperature.toFixed(1)} °C (febrícula 37.3-37.6 °C).`);
  else if (v.temperature < 36.1) yellowReasons.push(`Temperatura: ${v.temperature.toFixed(1)} °C (baja 35.8-36.0 °C).`);
  else nominalReasons.push(`Temperatura: ${v.temperature.toFixed(1)} °C (óptimo 36.1-37.2 °C).`);

  if (v.glucose > 125) redReasons.push(`Glucosa: ${v.glucose} mg/dL (umbral alto > 125 mg/dL).`);
  else if (v.glucose < 70) redReasons.push(`Glucosa: ${v.glucose} mg/dL (umbral bajo < 70 mg/dL).`);
  else if (v.glucose >= 100) yellowReasons.push(`Glucosa: ${v.glucose} mg/dL (elevada 100-125 mg/dL).`);
  else nominalReasons.push(`Glucosa: ${v.glucose} mg/dL (óptimo 70-99 mg/dL).`);

  if (redReasons.length > 0) {
    const reasons = [...redReasons, ...yellowReasons];
    let title = 'Glucosa en rango elevado (> 125 mg/dL)';
    let message = 'La glucemia supera el umbral de precaución en reposo. Verifica horario de comida, mantén hidratación y consulta con soporte médico.';
    if (v.temperature >= 37.7) {
      title = 'Temperatura en rango febril';
      message = 'Registras temperatura de fiebre. Suspende esfuerzos, hidrátate y notifica al equipo médico para seguimiento.';
    } else if (v.temperature < 35.8) {
      title = 'Temperatura corporal por debajo del rango seguro';
      message = 'Tu temperatura corporal está muy baja para actividad normal. Abrígate, descansa y notifica al equipo médico.';
    } else if (v.glucose < 70) {
      title = 'Glucosa en sangre por debajo de 70 mg/dL';
      message = 'Nivel de glucosa bajo que puede causar temblor o mareo. Detén tareas críticas, ingiere alimento según protocolo y notifica al equipo.';
    }
    return makeSystemCard('body', 'Cuerpo, Energía y Defensas', 'shield', STATUS.RED, title, message, ACTIONS.COMMS, reasons, REFERENCES.BODY);
  }

  if (yellowReasons.length > 0) {
    const reasons = [...yellowReasons, ...nominalReasons];
    const isTemp = v.temperature >= 37.3 || v.temperature < 36.1;
    return makeSystemCard(
      'body',
      'Cuerpo, Energía y Defensas',
      'shield',
      STATUS.YELLOW,
      isTemp ? 'Temperatura corporal fuera del óptimo' : 'Glucosa moderadamente elevada (100-125 mg/dL)',
      isTemp
        ? 'Tu temperatura está levemente fuera de lo habitual. Hidrátate, descansa y repite la medición en la siguiente ventana.'
        : 'Tu glucemia está por encima de 99 mg/dL. Si tus signos cardíacos son normales y no comiste recientemente, una sesión suave ayuda a regularla.',
      isTemp ? ACTIONS.HYDRATE : ACTIONS.EXERCISE,
      reasons,
      REFERENCES.BODY
    );
  }

  return makeSystemCard(
    'body',
    'Cuerpo, Energía y Defensas',
    'shield',
    STATUS.GREEN,
    'Temperatura y metabolismo en rango óptimo',
    'Tu temperatura corporal y glucosa en sangre están dentro de los valores de referencia.',
    ACTIONS.HYDRATE,
    nominalReasons,
    REFERENCES.BODY
  );
}
