'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAres } from '@/context/AresContext';
import {
  DEFAULT_CONTEXT,
  evaluateHealth,
  SCENARIOS_META,
  type PartialVitalValues,
  type ScenarioId,
  type SystemId,
} from '@/domain/health';
import type { PriorObservationInput } from '@/domain/health/context-specs';
import { createDefaultMissions } from '@/domain/missions/mission-catalog';
import { applyClinicalRestrictionsToMissions } from '@/domain/missions/mission-safety';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import type { NasaTimelinePoint } from '@/server/repositories/nasa-datasets-repo';
import {
  applyContextChange,
  applyMoodToDraft,
  applyNumericToDraft,
  bpmToCssDuration,
  dispatchEarthComms,
  mapObservationsToPrior,
  submitStudioCheckin,
  type NumericVitalField,
} from './studio-actions';
import {
  createCleanDraft,
  draftFromVitals,
  draftToPartialVitals,
  setDraftKeysMeasured,
  SYSTEM_TO_TARGET,
  type StudioDraft,
  type TabKey,
  type VitalToggleKey,
} from './studio-types';
import { STUDIO_NAV_ITEMS } from './StudioNavSvg';

const VITAL_COMPARE_KEYS = [
  'sleep_hours',
  'mood',
  'heart_rate',
  'bp_systolic',
  'bp_diastolic',
  'glucose',
  'temperature',
] as const;

function areVitalsEqual(
  a: PartialVitalValues | null | undefined,
  b: PartialVitalValues | null | undefined
): boolean {
  if (!a || !b) return false;
  return VITAL_COMPARE_KEYS.every((key) => (a[key] ?? null) === (b[key] ?? null));
}

export function useAresStudio(initialTab: TabKey) {
  const {
    state,
    authError,
    activeSimulation,
    activeNasaReplay,
    nasaTimeline,
    setNasaTimeline,
    refreshState,
    login,
    logout,
    applyUpdatedState,
    runSimulation,
    clearSimulation,
    activateNasaReplay,
    clearNasaReplay,
    completeMission,
    resetMissions,
  } = useAres();

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [draft, setDraft] = useState<StudioDraft>(() => createCleanDraft());
  const [context, setContext] = useState<ObservationContext>(() => ({ ...DEFAULT_CONTEXT }));
  const [highlightedSys, setHighlightedSys] = useState<SystemId | null>(null);
  const [nasaPriorObs, setNasaPriorObs] = useState<PriorObservationInput[]>([]);
  const [nasaObsId, setNasaObsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [completedLocalIds, setCompletedLocalIds] = useState<string[]>([]);
  const [commsSending, setCommsSending] = useState(false);
  const [commsSentAt, setCommsSentAt] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [breathOpen, setBreathOpen] = useState(false);
  const [breathSec, setBreathSec] = useState(10);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(draftFromVitals(state?.currentVitals ?? null));
    setContext(
      state?.currentContext
        ? { ...state.currentContext, symptoms: [...state.currentContext.symptoms] }
        : { ...DEFAULT_CONTEXT, symptoms: [] }
    );
  }, [state?.user.id, state?.lastCheckinAt, state?.currentVitals, state?.currentContext]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
  }, []);

  const clearHighlight = useCallback(() => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    highlightTimer.current = null;
    scrollTimer.current = null;
    setHighlightedSys(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = (event: PopStateEvent) => {
      const stateTab = (event.state as { tab?: TabKey } | null)?.tab;
      const matched =
        (stateTab && STUDIO_NAV_ITEMS.find((item) => item.key === stateTab)) ??
        STUDIO_NAV_ITEMS.find((item) => item.href === window.location.pathname);
      const nextTab = matched?.key ?? initialTab;
      if (nextTab !== 'controls') clearHighlight();
      setTab(nextTab);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [clearHighlight, initialTab]);

  const partialVitals = useMemo(() => draftToPartialVitals(draft), [draft]);

  const userPriorObservations = useMemo(() => {
    const obs = state?.observations ?? [];
    if (obs.length === 0) return [];
    const lastObs = obs[obs.length - 1];
    const matchesCurrent =
      areVitalsEqual(partialVitals, state?.currentVitals) &&
      (lastObs.capturedAt === state?.lastCheckinAt || areVitalsEqual(lastObs.vitals, state?.currentVitals));
    return mapObservationsToPrior(matchesCurrent ? obs.slice(0, -1) : obs);
  }, [state?.observations, state?.currentVitals, state?.lastCheckinAt, partialVitals]);

  const displayedDraft = activeNasaReplay
    ? draftFromVitals(activeNasaReplay.vitals)
    : activeSimulation
      ? draftFromVitals(activeSimulation.vitals)
      : draft;
  const displayedContext = activeNasaReplay?.evaluation.context ?? activeSimulation?.evaluation.context ?? context;

  const evaluation = useMemo(() => {
    if (activeNasaReplay) return activeNasaReplay.evaluation;
    if (activeSimulation) return activeSimulation.evaluation;
    return evaluateHealth(partialVitals, {
      context,
      priorObservations: nasaObsId ? nasaPriorObs : userPriorObservations,
    });
  }, [activeNasaReplay, activeSimulation, partialVitals, context, nasaObsId, nasaPriorObs, userPriorObservations]);

  const activeVitals = activeNasaReplay
    ? activeNasaReplay.vitals
    : activeSimulation
      ? activeSimulation.vitals
      : partialVitals;

  const isSimulationOrReplay = Boolean(activeSimulation || activeNasaReplay);
  const missionsEvaluation = isSimulationOrReplay ? (state?.evaluation ?? null) : evaluation;

  useEffect(() => {
    document.documentElement.style.setProperty('--bpm-duration', bpmToCssDuration(activeVitals.heart_rate));
    return () => {
      document.documentElement.style.removeProperty('--bpm-duration');
    };
  }, [activeVitals.heart_rate]);

  const commsSignature = useMemo(
    () =>
      JSON.stringify({
        vitals: activeVitals,
        context: displayedContext,
        sim: activeSimulation?.id ?? null,
        replay: activeNasaReplay
          ? `${activeNasaReplay.studyId}:${activeNasaReplay.subjectId}:${activeNasaReplay.relativeLabel}`
          : null,
      }),
    [activeVitals, displayedContext, activeSimulation?.id, activeNasaReplay]
  );
  const prevCommsSignature = useRef<string | null>(null);

  useEffect(() => {
    if (prevCommsSignature.current !== null && prevCommsSignature.current !== commsSignature) {
      setCommsSentAt(null);
    }
    prevCommsSignature.current = commsSignature;
  }, [commsSignature]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const handleCompleteMission = useCallback(
    async (missionId: string) => {
      if (missionId === 'exercise' && missionsEvaluation?.clinicalRestrictions?.restrictStrenuousExercise) {
        showToast('Ejercicio bloqueado por alerta clínica activa');
        return;
      }
      if (state) {
        try {
          const res = await completeMission(missionId);
          showToast(res.alreadyAwardedToday ? 'Misión ya completada hoy' : `+${res.awardedXp} XP ganados`);
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Error completando misión');
        }
        return;
      }
      setCompletedLocalIds((prev) => (prev.includes(missionId) ? prev : [...prev, missionId]));
      showToast('Misión completada');
    },
    [missionsEvaluation, state, completeMission, showToast]
  );

  const completeMissionRef = useRef(handleCompleteMission);
  useEffect(() => {
    completeMissionRef.current = handleCompleteMission;
  }, [handleCompleteMission]);

  useEffect(() => {
    if (!breathOpen) return;
    if (breathSec <= 0) {
      setBreathOpen(false);
      void completeMissionRef.current('breathe');
      return;
    }
    const timer = setTimeout(() => setBreathSec((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [breathOpen, breathSec]);

  function switchTab(next: TabKey) {
    if (next !== 'controls') clearHighlight();
    setTab(next);
    const meta = STUDIO_NAV_ITEMS.find((i) => i.key === next);
    if (meta && typeof window !== 'undefined' && window.location.pathname !== meta.href) {
      window.history.pushState({ tab: next }, '', meta.href);
    }
  }

  function clearModesIfNeeded() {
    clearSimulation();
    if (activeNasaReplay) {
      clearNasaReplay();
      setNasaObsId(null);
      setNasaPriorObs([]);
    }
  }

  function handleUpdateNumeric(field: NumericVitalField, value: number) {
    clearModesIfNeeded();
    setSaveMessage(null);
    setCommsSentAt(null);
    setDraft((prev) => applyNumericToDraft(prev, field, value));
  }

  function handleUpdateMood(idx: number) {
    clearModesIfNeeded();
    setSaveMessage(null);
    setCommsSentAt(null);
    setDraft((prev) => applyMoodToDraft(prev, idx));
  }

  function handleToggleSystemMeasured(keys: readonly VitalToggleKey[]) {
    const nextMeasured = !keys.some((key) => displayedDraft.measured[key]);
    clearModesIfNeeded();
    setSaveMessage(null);
    setCommsSentAt(null);
    setDraft((prev) => setDraftKeysMeasured(prev, keys, nextMeasured));
  }

  function handleChangeContext<K extends keyof ObservationContext>(key: K, val: ObservationContext[K]) {
    const inMode = Boolean(activeSimulation || activeNasaReplay);
    const seedDisplayedContext = displayedContext;
    clearModesIfNeeded();
    setSaveMessage(null);
    setCommsSentAt(null);
    setContext((prev) => applyContextChange(prev, seedDisplayedContext, inMode, key, val));
  }

  async function handleRunScenario(id: ScenarioId) {
    setSaveMessage(null);
    try {
      if (await runSimulation(id)) {
        setNasaObsId(null);
        setNasaPriorObs([]);
        setCommsSentAt(null);
        showToast(`${SCENARIOS_META[id].label}`);
      }
    } catch {
      showToast('No se pudo cargar la simulación. Inténtalo de nuevo.');
    }
  }

  function handleClearAllMeasured() {
    clearModesIfNeeded();
    setSaveMessage(null);
    setCommsSentAt(null);
    setDraft(createCleanDraft());
    setContext({ ...DEFAULT_CONTEXT, symptoms: [] });
    showToast('↺ Controles reiniciados (0/7 sin datos inventados)');
  }

  async function handleSaveCheckin() {
    if (savingRef.current || saving || activeSimulation || activeNasaReplay) return;
    savingRef.current = true;
    setSaving(true);
    setSaveMessage(null);
    try {
      const msg = await submitStudioCheckin({ userState: state, evaluation, partialVitals, context, applyUpdatedState });
      setSaveMessage(msg);
      if (msg.ok) showToast('Toma guardada en bitácora');
    } catch (err) {
      setSaveMessage({ ok: false, text: err instanceof Error ? err.message : 'Error guardando toma' });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function handleResetMissions() {
    try {
      await resetMissions();
      setCompletedLocalIds([]);
      showToast('Misiones del día reiniciadas');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al reiniciar misiones');
    }
  }

  async function handlePingEarth() {
    setCommsSending(true);
    try {
      const res = await dispatchEarthComms({ userState: state, evaluation, applyUpdatedState });
      setCommsSentAt(res.sentAt);
      showToast(res.copied ? 'Aviso copiado y registrado' : 'Aviso registrado en bitácora');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al registrar aviso');
    } finally {
      setCommsSending(false);
    }
  }

  function handleLoadReplayPoint(pt: NasaTimelinePoint, priorObs: PriorObservationInput[], pts: NasaTimelinePoint[]) {
    setNasaTimeline(pts);
    setNasaPriorObs(priorObs);
    setNasaObsId(pt.observation.observationId);
    setCommsSentAt(null);
    activateNasaReplay({
      subjectId: pt.observation.subjectId,
      studyId: pt.observation.studyId,
      cohortGroup: pt.observation.cohortGroup,
      relativeLabel: pt.observation.relativeLabel,
      vitals: pt.observation.vitals,
      evaluation: pt.evaluation,
    });
    switchTab('astro');
    showToast(`Cargado ${pt.observation.subjectId} (${pt.observation.relativeLabel})`);
  }

  function handleClearReplayOrSim() {
    clearSimulation();
    clearNasaReplay();
    setNasaObsId(null);
    setNasaPriorObs([]);
    setCommsSentAt(null);
    showToast('Regresaste a tu bitácora personal');
  }

  function handleHighlightSystem(sys: SystemId) {
    clearHighlight();
    switchTab('controls');
    setHighlightedSys(sys);
    scrollTimer.current = setTimeout(
      () => document.getElementById(SYSTEM_TO_TARGET[sys])?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      80
    );
    highlightTimer.current = setTimeout(() => setHighlightedSys(null), 2500);
  }

  const missions = useMemo(
    () => applyClinicalRestrictionsToMissions([...(state?.gamification.missions ?? createDefaultMissions())], missionsEvaluation),
    [state?.gamification.missions, missionsEvaluation]
  );

  return {
    state,
    authError,
    activeSimulation,
    activeNasaReplay,
    tab,
    draft: displayedDraft,
    context: displayedContext,
    highlightedSys,
    nasaTimeline,
    nasaObsId,
    saving,
    saveMessage,
    completedLocalIds,
    commsSending,
    commsSentAt,
    toastMsg,
    breathOpen,
    breathSec,
    evaluation,
    activeVitals,
    missions,
    refreshState,
    login,
    logout,
    switchTab,
    setBreathOpen,
    setBreathSec,
    setCompletedLocalIds,
    resetMissions: handleResetMissions,
    handleUpdateNumeric,
    handleUpdateMood,
    handleToggleSystemMeasured,
    handleChangeContext,
    handleRunScenario,
    handleClearAllMeasured,
    handleSaveCheckin,
    handleCompleteMission,
    handlePingEarth,
    handleLoadReplayPoint,
    handleClearReplayOrSim,
    handleHighlightSystem,
    clearHighlight,
  };
}
