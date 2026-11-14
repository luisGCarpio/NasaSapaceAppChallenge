'use client';

import { useEffect, useRef, useState } from 'react';

type SystemKey = 'mind' | 'heart' | 'body';
type MissionKey = 'water' | 'exercise' | 'sleep' | 'breath';
type ActionKey = 'water' | 'exercise' | 'sleep' | 'breath' | 'earth';
type ChartMode = 'wellness' | 'cross';

interface VitalsState {
  sleep: number;
  mood: number;
  bpm: number;
  sys: number;
  dia: number;
  glucose: number;
  temp: number;
}

interface Diagnosis {
  level: 0 | 1 | 2;
  tag: string;
  title: string;
  text: string;
  actions: ActionKey[];
}

const MOOD_NAMES = ['Al límite', 'Estresado', 'Cansado', 'Bien', 'Excelente'] as const;
const PAST_SCORES = [86, 91, 84, 79, 88, 92] as const;
const PAST_BPM = [70, 74, 78, 82, 75, 73] as const;
const PAST_GLUCOSE = [85, 90, 94, 98, 91, 89] as const;
const BREATH_PHASES = ['Inhala suave...', 'Sostén...', 'Exhala lento...'] as const;
const DAY_LABELS = ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'Ayer', 'Hoy'] as const;

function colorFor(lvl: number): string {
  return lvl === 0 ? 'var(--green)' : lvl === 1 ? 'var(--yellow)' : 'var(--red)';
}

function bgFor(lvl: number): string {
  return lvl === 0 ? 'var(--green-bg)' : lvl === 1 ? 'var(--yellow-bg)' : 'var(--red-bg)';
}

function evaluate(vitals: VitalsState): {
  mindLvl: 0 | 1 | 2;
  heartLvl: 0 | 1 | 2;
  bodyLvl: 0 | 1 | 2;
  diag: Diagnosis;
} {
  const { sleep, mood, bpm, sys, dia, glucose, temp } = vitals;

  let mindLvl: 0 | 1 | 2 = 0;
  if (sleep < 5.5 || mood === 0) mindLvl = 2;
  else if (sleep < 7.0 || mood <= 2) mindLvl = 1;

  let heartLvl: 0 | 1 | 2 = 0;
  if (bpm > 100 || bpm < 55 || sys >= 140 || dia >= 90 || sys < 90 || dia < 60) heartLvl = 2;
  else if (bpm > 85 || sys > 125 || dia > 80 || sys < 100) heartLvl = 1;

  let bodyLvl: 0 | 1 | 2 = 0;
  if (temp >= 37.8 || glucose > 125 || glucose < 70) bodyLvl = 2;
  else if (temp >= 37.3 || glucose > 99) bodyLvl = 1;

  const baseLevel = Math.max(mindLvl, heartLvl, bodyLvl) as 0 | 1 | 2;
  let diag: Diagnosis = {
    level: baseLevel,
    tag: 'ESTADO INTEGRAL',
    title: 'Todo tu cuerpo está en equilibrio',
    text: 'Tu descanso, circulación y energía funcionan en armonía. Estás en condiciones óptimas para tus tareas espaciales.',
    actions: ['water', 'exercise'],
  };

  const isDehydrated = bpm > 95 && (sys < 95 || dia < 60);
  const isInfection = temp >= 37.7 && (bpm > 85 || mood <= 2);
  const isOverload = sleep < 6 && mood <= 1 && (sys > 130 || dia > 85);
  const isZeroGSugar = glucose > 105;

  if (isDehydrated && isInfection) {
    diag = {
      level: 2,
      tag: 'DOBLE CRUCE • ALERTA ROJA',
      title: 'Deshidratación + Defensas Bajas',
      text: 'Tienes fiebre y tu presión bajó mientras tu corazón se acelera por falta de líquido. Hidrátate, descansa y avisa a Tierra.',
      actions: ['water', 'sleep', 'earth'],
    };
  } else if (isDehydrated) {
    diag = {
      level: 2,
      tag: 'CRUCE 1 • DESHIDRATACIÓN ESPACIAL',
      title: 'Falta líquido en tu circulación',
      text: 'En el espacio pierdes líquido sin darte cuenta. Tu corazón late más rápido porque tiene menos agua circulando y puedes marearte.',
      actions: ['water', 'sleep', 'earth'],
    };
  } else if (isInfection) {
    diag = {
      level: 2,
      tag: 'CRUCE 2 • ALERTA DE DEFENSAS',
      title: 'Posible infección o defensas bajas',
      text: 'El aislamiento y el estrés espacial bajaron tus defensas y tienes fiebre. Detén esfuerzos físicos ahora.',
      actions: ['water', 'sleep', 'earth'],
    };
  } else if (isOverload) {
    diag = {
      level: 2,
      tag: 'CRUCE 4 • SOBRECARGA Y FATIGA',
      title: 'El cansancio está subiendo tu presión',
      text: 'La falta de sueño está elevando tu presión arterial y bajando tus reflejos. Hoy hay riesgo de cometer errores.',
      actions: ['breath', 'sleep', 'earth'],
    };
  } else if (isZeroGSugar) {
    diag = {
      level: glucose > 125 ? 2 : 1,
      tag: 'CRUCE 3 • EFECTO GRAVEDAD CERO',
      title: 'Azúcar acumulada por flotar',
      text: 'Al flotar sin gravedad tus músculos trabajan menos y dejan el azúcar en tu sangre. Muévete para consumir esa energía.',
      actions: ['exercise', 'water'],
    };
  } else if (diag.level === 2) {
    diag = {
      level: 2,
      tag: 'ALERTA EN VARIABLE CRÍTICA',
      title: 'Un sistema requiere atención inmediata',
      text: 'Uno de tus indicadores salió del rango seguro. Toma una pausa, hidrátate y notifica al equipo de Tierra.',
      actions: ['water', 'breath', 'earth'],
    };
  } else if (diag.level === 1) {
    diag = {
      level: 1,
      tag: 'PRECAUCIÓN PREVENTIVA',
      title: 'Señales tempranas de desgaste',
      text: 'Aún estás a tiempo de corregirlo fácil: un poco de agua, estiramiento o descanso devolverán todo a verde.',
      actions: ['water', 'exercise', 'breath'],
    };
  }

  return { mindLvl, heartLvl, bodyLvl, diag };
}

export function AresStudioView() {
  const [vitals, setVitals] = useState<VitalsState>({
    sleep: 8.0,
    mood: 4,
    bpm: 72,
    sys: 115,
    dia: 75,
    glucose: 88,
    temp: 36.6,
  });
  const [highlightedSystem, setHighlightedSystem] = useState<SystemKey | null>(null);
  const [xp, setXp] = useState(120);
  const [level, setLevel] = useState(3);
  const [missions, setMissions] = useState<Record<MissionKey, boolean>>({
    water: false,
    exercise: false,
    sleep: false,
    breath: false,
  });
  const [chartMode, setChartMode] = useState<ChartMode>('wellness');
  const [breathOpen, setBreathOpen] = useState(false);
  const [breathText, setBreathText] = useState<string>('Inhala...');
  const [earthSent, setEarthSent] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const groupMindRef = useRef<HTMLDivElement>(null);
  const groupHeartRef = useRef<HTMLDivElement>(null);
  const groupBodyRef = useRef<HTMLDivElement>(null);

  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const earthTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const breathTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.documentElement.style.setProperty('--bpm-duration', `${(60 / vitals.bpm).toFixed(2)}s`);
  }, [vitals.bpm]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (earthTimerRef.current) clearTimeout(earthTimerRef.current);
      if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    };
  }, []);

  function showToast(msg: string) {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2600);
  }

  function addXP(amount: number) {
    let nextXp = xp + amount;
    let nextLevel = level;
    while (nextXp >= 200) {
      nextXp -= 200;
      nextLevel += 1;
      showToast(`🚀 ¡Subiste a Escudo Nivel ${nextLevel}!`);
    }
    if (nextXp < 0) nextXp = 0;
    setXp(nextXp);
    setLevel(nextLevel);
  }

  function toggleMission(key: MissionKey, xpGain: number, forceOn = false) {
    if (forceOn && missions[key]) {
      showToast('✓ ¡Misión ya registrada hoy!');
      return;
    }
    const nextDone = !missions[key];
    setMissions((prev) => ({ ...prev, [key]: nextDone }));

    if (nextDone) {
      addXP(xpGain);
      showToast(`✨ ¡Misión completada! +${xpGain} XP para tu Escudo`);
    } else {
      addXP(-xpGain);
    }
  }

  function openBreather() {
    setBreathOpen(true);
    let step = 0;
    setBreathText(BREATH_PHASES[0]);
    if (breathTimerRef.current) clearInterval(breathTimerRef.current);
    breathTimerRef.current = setInterval(() => {
      step = (step + 1) % BREATH_PHASES.length;
      setBreathText(BREATH_PHASES[step]);
    }, 2000);
  }

  function completeBreather() {
    if (breathTimerRef.current) {
      clearInterval(breathTimerRef.current);
      breathTimerRef.current = null;
    }
    setBreathOpen(false);
    if (!missions.breath) {
      toggleMission('breath', 25, true);
    } else {
      showToast('🧘 Pausa completada. ¡Excelente ritmo!');
    }
  }

  function pingEarth() {
    setEarthSent(true);
    showToast('📡 Señal enviada a la base en 0.4s');
    if (earthTimerRef.current) clearTimeout(earthTimerRef.current);
    earthTimerRef.current = setTimeout(() => {
      setEarthSent(false);
    }, 3200);
  }

  function highlightSystem(sys: SystemKey) {
    setHighlightedSystem(sys);
    const refMap: Record<SystemKey, React.RefObject<HTMLDivElement | null>> = {
      mind: groupMindRef,
      heart: groupHeartRef,
      body: groupBodyRef,
    };
    refMap[sys].current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedSystem(null);
    }, 1400);
  }

  const { mindLvl, heartLvl, bodyLvl, diag } = evaluate(vitals);

  const pctMind = Math.max(
    18,
    Math.min(100, Math.round((vitals.sleep / 8.5) * 60 + (vitals.mood / 4) * 40))
  );
  const pctHeartRaw = Math.max(
    15,
    Math.min(100, 100 - Math.abs(vitals.bpm - 72) * 1.1 - Math.abs(vitals.sys - 115) * 0.6)
  );
  const pctBodyRaw = Math.max(
    15,
    Math.min(
      100,
      100 - Math.max(0, vitals.glucose - 98) * 1.1 - Math.max(0, vitals.temp - 37.0) * 32
    )
  );

  const pctHeart = Math.round(pctHeartRaw);
  const pctBody = Math.round(pctBodyRaw);
  const todayScore = Math.round((pctMind + pctHeartRaw + pctBodyRaw) / 3);

  const actionMap: Record<ActionKey, { label: string; onClick: () => void; primary?: boolean }> = {
    water: { label: '💧 Hidratarse ahora', onClick: () => toggleMission('water', 25, true) },
    exercise: { label: '🏃 30 min ejercicio', onClick: () => toggleMission('exercise', 35, true) },
    sleep: { label: '😴 Descansar / Dormir', onClick: () => toggleMission('sleep', 30, true) },
    breath: { label: '🧘 Pausa mental 10s', onClick: openBreather },
    earth: { label: '📡 Avisar a Tierra', onClick: pingEarth, primary: true },
  };

  // Parámetros del gráfico SVG dinámico
  const W = 310;
  const H = 155;
  const padL = 26;
  const padR = 16;
  const padT = 10;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const yGreenEnd = padT + plotH * 0.3;
  const yYellowEnd = padT + plotH * 0.6;

  const scorePts = [...PAST_SCORES, todayScore];
  const scoreCoords = scorePts.map((v, i) => ({
    x: padL + (i / (scorePts.length - 1)) * plotW,
    y: padT + (1 - v / 100) * plotH,
    v,
  }));
  const scorePath = scoreCoords.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

  const buildCrossLine = (arr: number[], min: number, max: number) => {
    const cs = arr.map((v, i) => ({
      x: padL + (i / (arr.length - 1)) * plotW,
      y: padT + (1 - Math.min(1, Math.max(0, (v - min) / (max - min)))) * plotH,
    }));
    const d = cs.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    const last = cs[cs.length - 1];
    return { d, last };
  };

  const bpmLine = buildCrossLine([...PAST_BPM, vitals.bpm], 45, 140);
  const glucoseLine = buildCrossLine([...PAST_GLUCOSE, vitals.glucose], 55, 165);

  return (
    <>
      {/* BARRA SUPERIOR */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-badge">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v5a7 7 0 0 0 14 0v-5a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4Z" />
              <path d="M8 12h8" />
            </svg>
          </div>
          <div>
            <h1>A.R.E.S. Pulse</h1>
            <p>Chequeo Vivo del Astronauta • Motor de Cruce Fisiológico</p>
          </div>
        </div>
      </header>

      {/* CUADRÍCULA PRINCIPAL */}
      <main className="grid">
        {/* IZQUIERDA: LOS 6 CONTROLES INTERACTIVOS */}
        <section className="card">
          <div className="card-title">
            <span>Controles del Cuerpo</span>
            <span
              style={{
                fontSize: '0.74rem',
                color: 'var(--ink-muted)',
                fontFamily: "'Plus Jakarta Sans'",
                fontWeight: 700,
              }}
            >
              6 variables
            </span>
          </div>

          {/* SISTEMA 1: MENTE Y DESCANSO */}
          <div
            ref={groupMindRef}
            className={`system-group${highlightedSystem === 'mind' ? ' highlight' : ''}`}
            id="group-mind"
          >
            <div className="group-head">
              <div className="group-head-left">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5B6BFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z" />
                  <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z" />
                </svg>
                1. Mente y Descanso
              </div>
              <span className="dot-status" id="dot-mind" style={{ background: colorFor(mindLvl) }} />
            </div>

            <div className="control-row">
              <div className="control-label">
                <span>Horas de sueño</span>
                <span className="val-pill" id="val-sleep">
                  {vitals.sleep.toFixed(1)} h
                </span>
              </div>
              <input
                type="range"
                id="in-sleep"
                min={3}
                max={10}
                step={0.5}
                value={vitals.sleep}
                onChange={(e) =>
                  setVitals((prev) => ({ ...prev, sleep: parseFloat(e.target.value) }))
                }
              />
            </div>

            <div className="control-row">
              <div className="control-label">
                <span>Estado de ánimo</span>
                <span className="val-pill" id="val-mood">
                  {MOOD_NAMES[vitals.mood]}
                </span>
              </div>
              <div className="mood-grid" id="moodGrid">
                <button
                  type="button"
                  className={`mood-btn${vitals.mood === 0 ? ' selected' : ''}`}
                  data-mood="0"
                  onClick={() => setVitals((prev) => ({ ...prev, mood: 0 }))}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1917" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8 16s1.5-2 4-2 4 2 4 2" />
                    <path d="M8 9l2 2M10 9l-2 2M14 9l2 2M16 9l-2 2" />
                  </svg>
                  Límite
                </button>
                <button
                  type="button"
                  className={`mood-btn${vitals.mood === 1 ? ' selected' : ''}`}
                  data-mood="1"
                  onClick={() => setVitals((prev) => ({ ...prev, mood: 1 }))}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1917" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8 16h8" />
                    <path d="M8 9l3 1.5M16 9l-3 1.5" />
                  </svg>
                  Tenso
                </button>
                <button
                  type="button"
                  className={`mood-btn${vitals.mood === 2 ? ' selected' : ''}`}
                  data-mood="2"
                  onClick={() => setVitals((prev) => ({ ...prev, mood: 2 }))}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1917" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9 16c1-.8 5-.8 6 0" />
                    <path d="M8 10h2M14 10h2" />
                  </svg>
                  Cansado
                </button>
                <button
                  type="button"
                  className={`mood-btn${vitals.mood === 3 ? ' selected' : ''}`}
                  data-mood="3"
                  onClick={() => setVitals((prev) => ({ ...prev, mood: 3 }))}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1917" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8.5 14.5s1.5 2 3.5 2 3.5-2 3.5-2" />
                    <circle cx="9" cy="10" r="1" fill="#1C1917" />
                    <circle cx="15" cy="10" r="1" fill="#1C1917" />
                  </svg>
                  Bien
                </button>
                <button
                  type="button"
                  className={`mood-btn${vitals.mood === 4 ? ' selected' : ''}`}
                  data-mood="4"
                  onClick={() => setVitals((prev) => ({ ...prev, mood: 4 }))}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C1917" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8 14s1.5 3 4 3 4-3 4-3" />
                    <path d="M8 10c.5-1 1.5-1 2 0M14 10c.5-1 1.5-1 2 0" />
                  </svg>
                  Genial
                </button>
              </div>
            </div>
          </div>

          {/* SISTEMA 2: CORAZÓN Y CIRCULACIÓN */}
          <div
            ref={groupHeartRef}
            className={`system-group${highlightedSystem === 'heart' ? ' highlight' : ''}`}
            id="group-heart"
          >
            <div className="group-head">
              <div className="group-head-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF3B4E" stroke="#1C1917" strokeWidth="2">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                2. Corazón y Circulación
              </div>
              <span className="dot-status" id="dot-heart" style={{ background: colorFor(heartLvl) }} />
            </div>

            <div className="control-row">
              <div className="control-label">
                <span>Frecuencia cardíaca</span>
                <span className="val-pill" id="val-bpm">
                  {vitals.bpm} BPM
                </span>
              </div>
              <input
                type="range"
                id="in-bpm"
                min={45}
                max={135}
                step={1}
                value={vitals.bpm}
                onChange={(e) =>
                  setVitals((prev) => ({ ...prev, bpm: parseFloat(e.target.value) }))
                }
              />
            </div>

            <div className="control-row">
              <div className="control-label">
                <span>Presión arterial</span>
                <span className="val-pill" id="val-bp">
                  {vitals.sys}/{vitals.dia} mmHg
                </span>
              </div>
              <div className="dual-bp">
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
                    Alta (Sist.)
                  </span>
                  <input
                    type="range"
                    id="in-sys"
                    min={80}
                    max={160}
                    step={1}
                    value={vitals.sys}
                    onChange={(e) =>
                      setVitals((prev) => ({ ...prev, sys: parseFloat(e.target.value) }))
                    }
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
                    Baja (Diast.)
                  </span>
                  <input
                    type="range"
                    id="in-dia"
                    min={50}
                    max={105}
                    step={1}
                    value={vitals.dia}
                    onChange={(e) =>
                      setVitals((prev) => ({ ...prev, dia: parseFloat(e.target.value) }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SISTEMA 3: CUERPO, ENERGÍA Y DEFENSAS */}
          <div
            ref={groupBodyRef}
            className={`system-group${highlightedSystem === 'body' ? ' highlight' : ''}`}
            id="group-body"
          >
            <div className="group-head">
              <div className="group-head-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFB800" stroke="#1C1917" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                3. Energía y Defensas
              </div>
              <span className="dot-status" id="dot-body" style={{ background: colorFor(bodyLvl) }} />
            </div>

            <div className="control-row">
              <div className="control-label">
                <span>Glucosa en sangre</span>
                <span className="val-pill" id="val-glucose">
                  {vitals.glucose} mg/dL
                </span>
              </div>
              <input
                type="range"
                id="in-glucose"
                min={55}
                max={165}
                step={1}
                value={vitals.glucose}
                onChange={(e) =>
                  setVitals((prev) => ({ ...prev, glucose: parseFloat(e.target.value) }))
                }
              />
            </div>

            <div className="control-row">
              <div className="control-label">
                <span>Temperatura corporal</span>
                <span className="val-pill" id="val-temp">
                  {vitals.temp.toFixed(1)} °C
                </span>
              </div>
              <input
                type="range"
                id="in-temp"
                min={35.5}
                max={39.2}
                step={0.1}
                value={vitals.temp}
                onChange={(e) =>
                  setVitals((prev) => ({ ...prev, temp: parseFloat(e.target.value) }))
                }
              />
            </div>
          </div>
        </section>

        {/* CENTRO: ASTRONAUTA INTERACTIVO + SEMÁFORO DE CRUCE */}
        <section className="center-stack">
          <div className="astro-stage">
            <div className="stage-header">
              <div
                className="traffic-badge"
                id="trafficBadge"
                style={{ background: bgFor(diag.level) }}
              >
                <span
                  id="trafficDot"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: colorFor(diag.level),
                    border: '2px solid var(--ink)',
                  }}
                />
                <span id="trafficLabel">
                  {diag.level === 0
                    ? 'TODO EN ÓRBITA'
                    : diag.level === 1
                      ? 'CUIDADO PREVENTIVO'
                      : 'ALERTA ROJA'}
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
                Toca un nodo del cuerpo
              </span>
            </div>

            <div className="astro-svg-wrap">
              {/* BURBUJA DE ESTADO CONTEXTUAL */}
              <div
                className="floating-hint"
                id="floatHintLeft"
                style={{
                  top: 34,
                  left: 14,
                  opacity: vitals.bpm > 95 && vitals.sys < 95 ? 1 : 0,
                }}
              >
                💧 Falta agua
              </div>
              <div
                className="floating-hint"
                id="floatHintRight"
                style={{
                  top: 42,
                  right: 14,
                  opacity: vitals.temp >= 37.7 ? 1 : 0,
                }}
              >
                🔥 Fiebre
              </div>

              {/* ILUSTRACIÓN VECTORIAL DEL ASTRONAUTA */}
              <svg className="astro-float" width="275" height="280" viewBox="0 0 300 300" fill="none">
                {/* Mochila espacial */}
                <rect
                  x="88"
                  y="128"
                  width="124"
                  height="86"
                  rx="22"
                  fill="#FF5A26"
                  stroke="#1C1917"
                  strokeWidth="4"
                />

                {/* Piernas */}
                <rect
                  x="110"
                  y="212"
                  width="32"
                  height="58"
                  rx="14"
                  fill="#FFFDF8"
                  stroke="#1C1917"
                  strokeWidth="4"
                />
                <rect
                  x="158"
                  y="212"
                  width="32"
                  height="58"
                  rx="14"
                  fill="#FFFDF8"
                  stroke="#1C1917"
                  strokeWidth="4"
                />
                <rect
                  x="106"
                  y="252"
                  width="38"
                  height="20"
                  rx="10"
                  fill="#5B6BFF"
                  stroke="#1C1917"
                  strokeWidth="3.5"
                />
                <rect
                  x="156"
                  y="252"
                  width="38"
                  height="20"
                  rx="10"
                  fill="#5B6BFF"
                  stroke="#1C1917"
                  strokeWidth="3.5"
                />

                {/* Brazos */}
                <rect
                  x="56"
                  y="138"
                  width="42"
                  height="24"
                  rx="12"
                  transform="rotate(-18 56 138)"
                  fill="#FFFDF8"
                  stroke="#1C1917"
                  strokeWidth="4"
                />
                <rect
                  x="202"
                  y="126"
                  width="42"
                  height="24"
                  rx="12"
                  transform="rotate(18 202 126)"
                  fill="#FFFDF8"
                  stroke="#1C1917"
                  strokeWidth="4"
                />
                <circle cx="52" cy="156" r="11" fill="#FFB800" stroke="#1C1917" strokeWidth="3.5" />
                <circle cx="248" cy="156" r="11" fill="#FFB800" stroke="#1C1917" strokeWidth="3.5" />

                {/* Torso */}
                <rect
                  x="98"
                  y="126"
                  width="104"
                  height="96"
                  rx="28"
                  fill="#FFFDF8"
                  stroke="#1C1917"
                  strokeWidth="4"
                />
                {/* Cinturón */}
                <rect
                  x="100"
                  y="196"
                  width="100"
                  height="16"
                  rx="8"
                  fill="#EFE9DC"
                  stroke="#1C1917"
                  strokeWidth="3"
                />

                {/* Casco */}
                <circle cx="150" cy="78" r="56" fill="#FFFDF8" stroke="#1C1917" strokeWidth="4" />
                {/* Antena del casco (Nodo 1: Mente) */}
                <line
                  x1="150"
                  y1="22"
                  x2="150"
                  y2="8"
                  stroke="#1C1917"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <g className="hotspot" onClick={() => highlightSystem('mind')}>
                  <circle
                    id="node-mind"
                    cx="150"
                    cy="10"
                    r="9"
                    fill={colorFor(mindLvl)}
                    stroke="#1C1917"
                    strokeWidth="3"
                  />
                </g>

                {/* Visor del casco */}
                <rect
                  x="108"
                  y="46"
                  width="84"
                  height="62"
                  rx="28"
                  fill="#2A2845"
                  stroke="#1C1917"
                  strokeWidth="3.5"
                />
                <path
                  d="M120 56 C134 50, 152 50, 166 56"
                  stroke="#5B6BFF"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.7"
                />

                {/* Expresión facial dinámica dentro del visor */}
                <g id="face-happy" style={{ display: diag.level === 0 ? 'block' : 'none' }}>
                  <circle cx="133" cy="74" r="4.5" fill="#FFFDF8" />
                  <circle cx="167" cy="74" r="4.5" fill="#FFFDF8" />
                  <path
                    d="M138 87 Q150 97 162 87"
                    stroke="#18C97E"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
                <g id="face-tired" style={{ display: diag.level === 1 ? 'block' : 'none' }}>
                  <line
                    x1="127"
                    y1="74"
                    x2="139"
                    y2="74"
                    stroke="#FFFDF8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="161"
                    y1="74"
                    x2="173"
                    y2="74"
                    stroke="#FFFDF8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M140 90 Q150 86 160 90"
                    stroke="#FFB800"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
                <g id="face-alert" style={{ display: diag.level === 2 ? 'block' : 'none' }}>
                  <path
                    d="M128 70 L138 78 M138 70 L128 78"
                    stroke="#FFFDF8"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M162 70 L172 78 M172 70 L162 78"
                    stroke="#FFFDF8"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <ellipse cx="150" cy="91" rx="7" ry="5" fill="#FF3B4E" />
                </g>

                {/* NODO 2: CORAZÓN QUE LATE AL RITMO REAL */}
                <g className="hotspot heart-beat" onClick={() => highlightSystem('heart')}>
                  <circle cx="150" cy="166" r="19" fill="#FFFDF8" stroke="#1C1917" strokeWidth="3" />
                  <path
                    id="node-heart"
                    d="M150 176 C150 176 138 168 138 161 A5.5 5.5 0 0 1 150 159 A5.5 5.5 0 0 1 162 161 C162 168 150 176 150 176Z"
                    fill={colorFor(heartLvl)}
                    stroke="#1C1917"
                    strokeWidth="2.2"
                  />
                </g>

                {/* NODO 3: ENERGÍA Y DEFENSAS (CINTURÓN) */}
                <g className="hotspot" onClick={() => highlightSystem('body')}>
                  <rect
                    id="node-body"
                    x="136"
                    y="194"
                    width="28"
                    height="20"
                    rx="6"
                    fill={colorFor(bodyLvl)}
                    stroke="#1C1917"
                    strokeWidth="2.8"
                  />
                  <polygon points="151,197 146,204 150,204 149,211 154,203 150,203" fill="#1C1917" />
                </g>
              </svg>
            </div>
          </div>

          {/* EXPLICACIÓN HUMANA + ACCIONES */}
          <div className="diagnosis-card" id="diagnosisCard" style={{ background: bgFor(diag.level) }}>
            <span className="diagnosis-tag" id="diagTag">
              {diag.tag}
            </span>
            <h2 className="diagnosis-title" id="diagTitle">
              {diag.title}
            </h2>
            <p className="diagnosis-text" id="diagText">
              {diag.text}
            </p>
            <div className="actions-row" id="actionsRow">
              {diag.actions.map((key) => {
                const action = actionMap[key];
                return (
                  <button
                    key={key}
                    type="button"
                    className={`action-chip${action.primary ? ' primary-alert' : ''}`}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* DERECHA: GRÁFICA DINÁMICA + GAMIFICACIÓN */}
        <section className="right-stack">
          {/* GRÁFICA EN VIVO */}
          <div className="card">
            <div className="card-title">
              <span>Monitor en Vivo</span>
              <div className="chart-tabs">
                <button
                  type="button"
                  className={`chart-tab${chartMode === 'wellness' ? ' active' : ''}`}
                  onClick={() => setChartMode('wellness')}
                >
                  Equilibrio
                </button>
                <button
                  type="button"
                  className={`chart-tab${chartMode === 'cross' ? ' active' : ''}`}
                  onClick={() => setChartMode('cross')}
                >
                  Pulso / Azúcar
                </button>
              </div>
            </div>

            <div className="chart-box">
              <svg id="liveChart" viewBox="0 0 310 155" width="100%" height="155">
                {chartMode === 'wellness' ? (
                  <>
                    <rect
                      x={padL}
                      y={padT}
                      width={plotW}
                      height={yGreenEnd - padT}
                      fill="#DFF9EC"
                      rx={4}
                    />
                    <rect
                      x={padL}
                      y={yGreenEnd}
                      width={plotW}
                      height={yYellowEnd - yGreenEnd}
                      fill="#FFF3CC"
                    />
                    <rect
                      x={padL}
                      y={yYellowEnd}
                      width={plotW}
                      height={padT + plotH - yYellowEnd}
                      fill="#FFE2E5"
                      rx={4}
                    />
                    <path
                      d={scorePath}
                      fill="none"
                      stroke="#1C1917"
                      strokeWidth={3.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {scoreCoords.map((p, i) => {
                      const isLast = i === scoreCoords.length - 1;
                      const fill = isLast ? '#FF5A26' : '#FFFDF8';
                      return (
                        <g key={i}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isLast ? 6.5 : 4}
                            fill={fill}
                            stroke="#1C1917"
                            strokeWidth={2.5}
                          />
                          {isLast ? (
                            <text
                              x={p.x - 4}
                              y={p.y - 11}
                              fontFamily="Space Mono"
                              fontSize={10}
                              fontWeight={700}
                              fill="#1C1917"
                            >
                              {p.v}%
                            </text>
                          ) : null}
                        </g>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <rect x={padL} y={padT} width={plotW} height={plotH} fill="#F6F2E9" rx={6} />
                    <path
                      d={bpmLine.d}
                      fill="none"
                      stroke="#FF3B4E"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={bpmLine.last.x}
                      cy={bpmLine.last.y}
                      r={5.5}
                      fill="#FF3B4E"
                      stroke="#1C1917"
                      strokeWidth={2}
                    />
                    <path
                      d={glucoseLine.d}
                      fill="none"
                      stroke="#5B6BFF"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={glucoseLine.last.x}
                      cy={glucoseLine.last.y}
                      r={5.5}
                      fill="#5B6BFF"
                      stroke="#1C1917"
                      strokeWidth={2}
                    />
                    <text x={padL + 6} y={padT + 14} fontSize={9} fontWeight={800} fill="#FF3B4E">
                      ● Pulso ({vitals.bpm})
                    </text>
                    <text x={padL + 92} y={padT + 14} fontSize={9} fontWeight={800} fill="#5B6BFF">
                      ● Glucosa ({vitals.glucose})
                    </text>
                  </>
                )}

                {DAY_LABELS.map((lbl, i) => {
                  const x = padL + (i / (DAY_LABELS.length - 1)) * plotW;
                  return (
                    <text
                      key={lbl}
                      x={x}
                      y={H - 6}
                      textAnchor="middle"
                      fontSize={9.5}
                      fontWeight={800}
                      fill={i === 6 ? '#FF5A26' : '#6B655E'}
                    >
                      {lbl}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* RESUMEN VISUAL DE LOS 3 SISTEMAS */}
            <div className="mini-bars">
              <div className="mini-bar-item">
                <div style={{ fontSize: '0.7rem', fontWeight: 800 }}>Mente</div>
                <div className="mini-bar-track">
                  <div
                    className="mini-bar-fill"
                    id="bar-mind"
                    style={{ width: `${pctMind}%`, background: colorFor(mindLvl) }}
                  />
                </div>
                <div className="mono" style={{ fontSize: '0.7rem' }} id="pct-mind">
                  {pctMind}%
                </div>
              </div>
              <div className="mini-bar-item">
                <div style={{ fontSize: '0.7rem', fontWeight: 800 }}>Corazón</div>
                <div className="mini-bar-track">
                  <div
                    className="mini-bar-fill"
                    id="bar-heart"
                    style={{ width: `${pctHeart}%`, background: colorFor(heartLvl) }}
                  />
                </div>
                <div className="mono" style={{ fontSize: '0.7rem' }} id="pct-heart">
                  {pctHeart}%
                </div>
              </div>
              <div className="mini-bar-item">
                <div style={{ fontSize: '0.7rem', fontWeight: 800 }}>Defensas</div>
                <div className="mini-bar-track">
                  <div
                    className="mini-bar-fill"
                    id="bar-body"
                    style={{ width: `${pctBody}%`, background: colorFor(bodyLvl) }}
                  />
                </div>
                <div className="mono" style={{ fontSize: '0.7rem' }} id="pct-body">
                  {pctBody}%
                </div>
              </div>
            </div>
          </div>

          {/* GAMIFICACIÓN: MISIONES Y BOTÓN A TIERRA */}
          <div className="card">
            <div className="card-title">
              <span>Misiones de Hoy</span>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--periwinkle)' }}>
                Toca para sumar XP
              </span>
            </div>

            <div className="missions-list">
              <button
                type="button"
                className={`mission-btn${missions.water ? ' done' : ''}`}
                id="m-water"
                onClick={() => toggleMission('water', 25)}
              >
                <div className="mission-top">
                  <span>💧 Hidratarse</span>
                  <span className="mission-xp">+25</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                  500 ml de agua
                </span>
              </button>
              <button
                type="button"
                className={`mission-btn${missions.exercise ? ' done' : ''}`}
                id="m-exercise"
                onClick={() => toggleMission('exercise', 35)}
              >
                <div className="mission-top">
                  <span>🏃 Estirar</span>
                  <span className="mission-xp">+35</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                  30 min sin gravedad
                </span>
              </button>
              <button
                type="button"
                className={`mission-btn${missions.sleep ? ' done' : ''}`}
                id="m-sleep"
                onClick={() => toggleMission('sleep', 30)}
              >
                <div className="mission-top">
                  <span>😴 Descanso</span>
                  <span className="mission-xp">+30</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                  Meta: 8 horas
                </span>
              </button>
              <button
                type="button"
                className={`mission-btn${missions.breath ? ' done' : ''}`}
                id="m-breath"
                onClick={openBreather}
              >
                <div className="mission-top">
                  <span>🧘 Pausa 10s</span>
                  <span className="mission-xp">+25</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
                  Mini-juego calma
                </span>
              </button>
            </div>

            <button
              type="button"
              className={`earth-btn${earthSent ? ' sent' : ''}`}
              id="earthBtn"
              onClick={pingEarth}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M22 2L11 13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span id="earthBtnText">
                {earthSent
                  ? '✓ Reporte recibido en Control de Tierra'
                  : 'Avisar estado a Tierra (1 clic)'}
              </span>
            </button>
          </div>
        </section>
      </main>

      {/* MINI-JUEGO DE RESPIRACIÓN */}
      <div className={`breath-overlay${breathOpen ? ' open' : ''}`} id="breathModal">
        <div className="breath-modal">
          <h2 className="font-display">Pausa Orbital</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--ink-muted)', fontWeight: 600, marginTop: 4 }}>
            Sigue el ritmo del círculo para bajar tu pulso.
          </p>
          <div className="breath-orb" id="breathText">
            {breathText}
          </div>
          <button
            type="button"
            className="btn-tactile"
            style={{ background: 'var(--green-bg)', margin: '0 auto' }}
            onClick={completeBreather}
          >
            ✓ Listo, me siento más tranquilo (+25 XP)
          </button>
        </div>
      </div>

      {/* TOAST */}
      <div className={`toast${toastVisible ? ' show' : ''}`} id="toast">
        {toastMsg}
      </div>
    </>
  );
}
