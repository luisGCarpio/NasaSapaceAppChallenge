'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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
import type { GravityStressMode } from '@/domain/nasa/cohort-decision';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import type { NasaTimelinePoint } from '@/server/repositories/nasa-datasets-repo';
import {
  shouldOpenMissionModal,
  type MissionActionId,
  type MissionSceneStateVariant,
} from './mission-scene-machine';
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

export type MissionId = string;

export interface ActiveMissionScene {
  actionId: MissionActionId;
  variant: MissionSceneStateVariant;
  restrictionReason?: string | null;
  key: number;
}

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
    resetDemoState,
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
  const [draft, setDraft] = useState<StudioDraft>(() => draftFromVitals(state?.currentVitals ?? null));
  const [context, setContext] = useState<ObservationContext>(() =>
    state?.currentContext
      ? { ...state.currentContext, symptoms: [...state.currentContext.symptoms] }
      : { ...DEFAULT_CONTEXT, symptoms: [] }
  );
  const [highlightedSys, setHighlightedSys] = useState<SystemId | null>(null);
  const [nasaPriorObs, setNasaPriorObs] = useState<PriorObservationInput[]>([]);
  const [nasaObsId, setNasaObsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [completedLocalIds, setCompletedLocalIds] = useState<string[]>([]);
  const initialHydrateDone = Boolean(
    state?.gamification?.missions?.find((m) => m.id === 'hydrate')?.completed
  );
  const [hydrationLevel, setHydrationLevel] = useState<number>(initialHydrateDone ? 4 : 0);
  const hydrationLevelRef = useRef<number>(initialHydrateDone ? 4 : 0);
  const [exerciseStep, setExerciseStep] = useState<number>(0);
  const exerciseStepRef = useRef<number>(0);
  const [restNightActive, setRestNightActive] = useState<boolean>(false);
  const restNightActiveRef = useRef<boolean>(false);
  const [breathRounds, setBreathRounds] = useState<number>(0);
  const breathRoundsRef = useRef<number>(0);
  const [commsSending, setCommsSending] = useState(false);
  const commsSendingRef = useRef(false);
  const [commsSentAt, setCommsSentAt] = useState<string | null>(null);
  const [commsError, setCommsError] = useState<string | null>(null);
  const [lastCommsResult, setLastCommsResult] = useState<{ copied: boolean; sentAt: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [stressMode, setStressMode] = useState<GravityStressMode>('post_bedrest_median');
  const [activeMissionScene, setActiveMissionScene] = useState<ActiveMissionScene | null>(null);
  const activeMissionSceneRef = useRef<ActiveMissionScene | null>(null);
  const sceneKeyRef = useRef(0);
  const inFlightMissionsRef = useRef<Set<MissionId>>(new Set());
  const resettingRef = useRef(false);
  const prevMissionSyncRef = useRef<{
    userId: string | null;
    lastResetDate: string | null;
    completedById: Record<string, boolean>;
  }>({
    userId: null,
    lastResetDate: null,
    completedById: { hydrate: false, exercise: false, rest: false, breathe: false },
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Un cambio de misiones o comunicaciones puede recrear los objetos sin cambiar
  // los datos guardados. Solo rehidratar cuando cambie la medición real.
  const savedMeasurementKey = JSON.stringify([
    state?.user.id ?? null,
    state?.lastCheckinAt ?? null,
    state?.currentVitals ?? null,
    state?.currentContext ?? null,
  ]);
  useEffect(() => {
    setDraft(draftFromVitals(state?.currentVitals ?? null));
    setContext(
      state?.currentContext
        ? { ...state.currentContext, symptoms: [...state.currentContext.symptoms] }
        : { ...DEFAULT_CONTEXT, symptoms: [] }
    );
  }, [savedMeasurementKey]);

  useEffect(() => {
    const nextUserId = state?.user.id ?? null;
    const nextResetDate = state?.gamification?.lastResetDate ?? null;
    const missionsList = state?.gamification?.missions;
    const nextCompletedById: Record<string, boolean> = {
      hydrate: Boolean(missionsList?.find((m) => m.id === 'hydrate')?.completed),
      exercise: Boolean(missionsList?.find((m) => m.id === 'exercise')?.completed),
      rest: Boolean(missionsList?.find((m) => m.id === 'rest')?.completed),
      breathe: Boolean(missionsList?.find((m) => m.id === 'breathe')?.completed),
    };

    const prev = prevMissionSyncRef.current;
    const contextChanged = prev.userId !== nextUserId || prev.lastResetDate !== nextResetDate;

    if (contextChanged) {
      const nextHydration = nextCompletedById.hydrate ? 4 : 0;
      hydrationLevelRef.current = nextHydration;
      setHydrationLevel(nextHydration);

      const nextExercise = nextCompletedById.exercise ? 4 : 0;
      exerciseStepRef.current = nextExercise;
      setExerciseStep(nextExercise);

      restNightActiveRef.current = nextCompletedById.rest;
      setRestNightActive(nextCompletedById.rest);

      const nextBreathe = nextCompletedById.breathe ? 2 : 0;
      breathRoundsRef.current = nextBreathe;
      setBreathRounds(nextBreathe);

      setCompletedLocalIds([]);
    } else {
      if (prev.completedById.hydrate !== nextCompletedById.hydrate) {
        const nextHydration = nextCompletedById.hydrate ? 4 : 0;
        hydrationLevelRef.current = nextHydration;
        setHydrationLevel(nextHydration);
      }
      if (prev.completedById.exercise !== nextCompletedById.exercise) {
        const nextExercise = nextCompletedById.exercise ? 4 : 0;
        exerciseStepRef.current = nextExercise;
        setExerciseStep(nextExercise);
      }
      if (prev.completedById.rest !== nextCompletedById.rest) {
        restNightActiveRef.current = nextCompletedById.rest;
        setRestNightActive(nextCompletedById.rest);
      }
      if (prev.completedById.breathe !== nextCompletedById.breathe) {
        const nextBreathe = nextCompletedById.breathe ? 2 : 0;
        breathRoundsRef.current = nextBreathe;
        setBreathRounds(nextBreathe);
      }
      const resetIds = (['hydrate', 'exercise', 'rest', 'breathe'] as const).filter(
        (id) => prev.completedById[id] && !nextCompletedById[id]
      );
      if (resetIds.length > 0) {
        setCompletedLocalIds((curr) => curr.filter((id) => !resetIds.includes(id as (typeof resetIds)[number])));
      }
    }

    prevMissionSyncRef.current = {
      userId: nextUserId,
      lastResetDate: nextResetDate,
      completedById: nextCompletedById,
    };
  }, [state?.user.id, state?.gamification?.lastResetDate, state?.gamification?.missions]);

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
  const deferredDraft = useDeferredValue(draft);
  const deferredPartialVitals = useMemo(
    () => (deferredDraft === draft ? partialVitals : draftToPartialVitals(deferredDraft)),
    [deferredDraft, draft, partialVitals]
  );

  const userPriorObservations = useMemo(() => {
    const obs = state?.observations ?? [];
    if (obs.length === 0) return [];
    const lastObs = obs[obs.length - 1];
    const matchesCurrent =
      areVitalsEqual(deferredPartialVitals, state?.currentVitals) &&
      (lastObs.capturedAt === state?.lastCheckinAt || areVitalsEqual(lastObs.vitals, state?.currentVitals));
    return mapObservationsToPrior(matchesCurrent ? obs.slice(0, -1) : obs);
  }, [state?.observations, state?.currentVitals, state?.lastCheckinAt, deferredPartialVitals]);

  const displayedDraft = activeNasaReplay
    ? draftFromVitals(activeNasaReplay.vitals)
    : activeSimulation
      ? draftFromVitals(activeSimulation.vitals)
      : draft;
  const displayedContext = activeNasaReplay?.evaluation.context ?? activeSimulation?.evaluation.context ?? context;

  const evaluation = useMemo(() => {
    if (activeNasaReplay) return activeNasaReplay.evaluation;
    if (activeSimulation) return activeSimulation.evaluation;
    return evaluateHealth(deferredPartialVitals, {
      context,
      priorObservations: nasaObsId ? nasaPriorObs : userPriorObservations,
    });
  }, [activeNasaReplay, activeSimulation, deferredPartialVitals, context, nasaObsId, nasaPriorObs, userPriorObservations]);

  const activeVitals = activeNasaReplay
    ? activeNasaReplay.vitals
    : activeSimulation
      ? activeSimulation.vitals
      : partialVitals;

  const isSimulationOrReplay = Boolean(activeSimulation || activeNasaReplay);
  const missionsEvaluation = isSimulationOrReplay ? (state?.evaluation ?? null) : evaluation;

  const bpmDuration = tab === 'astro' ? bpmToCssDuration(activeVitals.heart_rate) : null;
  useEffect(() => {
    if (!bpmDuration) return;
    document.documentElement.style.setProperty('--bpm-duration', bpmDuration);
    return () => {
      document.documentElement.style.removeProperty('--bpm-duration');
    };
  }, [bpmDuration]);

  const prevCommsInputsRef = useRef<{
    vitals: PartialVitalValues;
    context: ObservationContext;
    simId: ScenarioId | null;
    replayKey: string | null;
  } | null>(null);
  const hasCommsStatus = Boolean(commsSentAt || commsError || lastCommsResult);
  const simId = activeSimulation?.id ?? null;
  const replayKey = activeNasaReplay
    ? `${activeNasaReplay.studyId}:${activeNasaReplay.subjectId}:${activeNasaReplay.relativeLabel}`
    : null;

  const resetCommsStatus = useCallback(() => {
    setCommsSentAt(null);
    setCommsError(null);
    setLastCommsResult(null);
  }, []);

  useEffect(() => {
    const prev = prevCommsInputsRef.current;
    prevCommsInputsRef.current = {
      vitals: activeVitals,
      context: displayedContext,
      simId,
      replayKey,
    };
    if (!prev || !hasCommsStatus) return;
    if (
      prev.simId !== simId ||
      prev.replayKey !== replayKey ||
      prev.context !== displayedContext ||
      !areVitalsEqual(prev.vitals, activeVitals)
    ) {
      resetCommsStatus();
    }
  }, [activeVitals, displayedContext, simId, replayKey, hasCommsStatus, resetCommsStatus]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2800);
  }, []);

  const openMissionScene = useCallback(
    (actionId: MissionActionId, variant: MissionSceneStateVariant = 'normal', restrictionReason?: string | null) => {
      sceneKeyRef.current += 1;
      const nextScene: ActiveMissionScene = {
        actionId,
        variant,
        restrictionReason: restrictionReason ?? null,
        key: sceneKeyRef.current,
      };
      activeMissionSceneRef.current = nextScene;
      setActiveMissionScene(nextScene);
    },
    []
  );

  const closeMissionScene = useCallback(() => {
    activeMissionSceneRef.current = null;
    setActiveMissionScene(null);
  }, []);

  const persistMissionCompletion = useCallback(
    async (missionId: MissionId) => {
      if (resettingRef.current || inFlightMissionsRef.current.has(missionId)) return;
      if (state) {
        inFlightMissionsRef.current.add(missionId);
        try {
          const res = await completeMission(missionId);
          showToast(res.alreadyAwardedToday ? 'Misión ya completada hoy' : 'Protocolo completado');
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Error completando misión');
        } finally {
          inFlightMissionsRef.current.delete(missionId);
        }
        return;
      }
      setCompletedLocalIds((prev) => (prev.includes(missionId) ? prev : [...prev, missionId]));
      showToast('Protocolo completado');
    },
    [state, completeMission, showToast]
  );

  const isMissionAlreadyDone = useCallback(
    (missionId: MissionId) =>
      completedLocalIds.includes(missionId) ||
      Boolean(state?.gamification?.missions?.find((m) => m.id === missionId)?.completed),
    [completedLocalIds, state?.gamification?.missions]
  );

  const handleAdvanceExercise = useCallback(async () => {
    if (resettingRef.current || inFlightMissionsRef.current.has('exercise')) return;
    if (missionsEvaluation?.clinicalRestrictions?.restrictStrenuousExercise) {
      openMissionScene('exercise', 'blocked', missionsEvaluation.clinicalRestrictions.reasons.join(' '));
      return;
    }
    const nextStep = Math.min(4, exerciseStepRef.current + 1);
    exerciseStepRef.current = nextStep;
    setExerciseStep(nextStep);
    if (nextStep >= 4 && !isMissionAlreadyDone('exercise')) {
      await persistMissionCompletion('exercise');
    }
  }, [missionsEvaluation, openMissionScene, isMissionAlreadyDone, persistMissionCompletion]);

  const handleToggleRest = useCallback(async () => {
    if (resettingRef.current || inFlightMissionsRef.current.has('rest')) return;
    const nextNight = !restNightActiveRef.current;
    restNightActiveRef.current = nextNight;
    setRestNightActive(nextNight);
    if (nextNight && !isMissionAlreadyDone('rest')) {
      await persistMissionCompletion('rest');
    }
  }, [isMissionAlreadyDone, persistMissionCompletion]);

  const handleCompleteBreathRound = useCallback(async () => {
    if (resettingRef.current || inFlightMissionsRef.current.has('breathe')) return;
    const nextRounds = Math.min(2, breathRoundsRef.current + 1);
    breathRoundsRef.current = nextRounds;
    setBreathRounds(nextRounds);
    if (nextRounds >= 2 && !isMissionAlreadyDone('breathe')) {
      await persistMissionCompletion('breathe');
    }
  }, [isMissionAlreadyDone, persistMissionCompletion]);

  const handleCompleteMission = useCallback(
    async (missionId: MissionId) => {
      if (resettingRef.current || inFlightMissionsRef.current.has(missionId)) return;
      if (missionId === 'exercise' && missionsEvaluation?.clinicalRestrictions?.restrictStrenuousExercise) {
        openMissionScene('exercise', 'blocked', missionsEvaluation.clinicalRestrictions.reasons.join(' '));
        return;
      }
      if (missionId === 'breathe') {
        openMissionScene('breathe', 'normal');
        return;
      }
      if (missionId === 'hydrate') {
        const nextLevel = Math.min(4, hydrationLevelRef.current + 1);
        hydrationLevelRef.current = nextLevel;
        setHydrationLevel(nextLevel);
        if (nextLevel >= 4 && !isMissionAlreadyDone('hydrate')) {
          await persistMissionCompletion('hydrate');
        }
        return;
      }
      if (missionId === 'exercise') {
        exerciseStepRef.current = 4;
        setExerciseStep(4);
      } else if (missionId === 'rest') {
        restNightActiveRef.current = true;
        setRestNightActive(true);
      }
      if (shouldOpenMissionModal(missionId) && (missionId === 'exercise' || missionId === 'rest')) {
        openMissionScene(missionId, 'normal');
      }
      await persistMissionCompletion(missionId);
    },
    [
      missionsEvaluation,
      openMissionScene,
      persistMissionCompletion,
      isMissionAlreadyDone,
    ]
  );

  const handleOpenBreather = useCallback(() => {
    openMissionScene('breathe', 'normal');
  }, [openMissionScene]);

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
    if (activeNasaReplay || nasaObsId) {
      clearNasaReplay();
      setNasaObsId(null);
      setNasaPriorObs([]);
    }
  }

  function handleUpdateNumeric(field: NumericVitalField, value: number) {
    clearModesIfNeeded();
    setSaveMessage(null);
    resetCommsStatus();
    setDraft((prev) => applyNumericToDraft(prev, field, value));
  }

  function handleUpdateMood(idx: number) {
    clearModesIfNeeded();
    setSaveMessage(null);
    resetCommsStatus();
    setDraft((prev) => applyMoodToDraft(prev, idx));
  }

  function handleToggleSystemMeasured(keys: readonly VitalToggleKey[]) {
    const nextMeasured = !keys.some((key) => displayedDraft.measured[key]);
    clearModesIfNeeded();
    setSaveMessage(null);
    resetCommsStatus();
    setDraft((prev) => setDraftKeysMeasured(prev, keys, nextMeasured));
  }

  function handleChangeContext<K extends keyof ObservationContext>(key: K, val: ObservationContext[K]) {
    const inMode = Boolean(activeSimulation || activeNasaReplay);
    const seedDisplayedContext = displayedContext;
    clearModesIfNeeded();
    setSaveMessage(null);
    resetCommsStatus();
    setContext((prev) => applyContextChange(prev, seedDisplayedContext, inMode, key, val));
  }

  async function handleRunScenario(id: ScenarioId) {
    setSaveMessage(null);
    try {
      if (await runSimulation(id)) {
        setNasaObsId(null);
        setNasaPriorObs([]);
        resetCommsStatus();
        showToast(`${SCENARIOS_META[id].label}`);
      }
    } catch {
      showToast('No se pudo cargar la simulación. Inténtalo de nuevo.');
    }
  }

  function handleClearAllMeasured() {
    const wasSimOrReplay = Boolean(activeSimulation || activeNasaReplay);
    clearModesIfNeeded();
    setSaveMessage(null);
    resetCommsStatus();
    setDraft(createCleanDraft());
    setContext({ ...DEFAULT_CONTEXT, symptoms: [] });
    showToast(
      wasSimOrReplay
        ? 'Simulación cerrada · Controles reiniciados (0/7)'
        : 'Controles reiniciados (0/7 sin datos inventados)'
    );
  }

  async function handleSaveCheckin() {
    if (savingRef.current || saving || activeSimulation || activeNasaReplay) return;
    savingRef.current = true;
    setSaving(true);
    setSaveMessage(null);
    try {
      const latestEvaluation =
        deferredDraft === draft
          ? evaluation
          : evaluateHealth(partialVitals, {
              context,
              priorObservations: nasaObsId ? nasaPriorObs : userPriorObservations,
            });
      const msg = await submitStudioCheckin({
        userState: state,
        evaluation: latestEvaluation,
        partialVitals,
        context,
        applyUpdatedState,
      });
      if (msg.ok) {
        showToast(msg.text.includes('anteriormente') ? msg.text : 'Medición guardada');
      } else {
        setSaveMessage(msg);
      }
    } catch (err) {
      setSaveMessage({ ok: false, text: err instanceof Error ? err.message : 'Error guardando toma' });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function handleResetMissions() {
    if (resettingRef.current) return;
    resettingRef.current = true;
    try {
      if (state) {
        await resetMissions();
      }
      setCompletedLocalIds([]);
      hydrationLevelRef.current = 0;
      setHydrationLevel(0);
      exerciseStepRef.current = 0;
      setExerciseStep(0);
      restNightActiveRef.current = false;
      setRestNightActive(false);
      breathRoundsRef.current = 0;
      setBreathRounds(0);
      showToast('Misiones del día reiniciadas');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al reiniciar misiones');
    } finally {
      resettingRef.current = false;
    }
  }

  async function handlePingEarth(options?: { openScene?: boolean }) {
    if (commsSendingRef.current) return;
    commsSendingRef.current = true;
    setCommsError(null);
    if (options?.openScene) {
      openMissionScene('comms', 'normal');
    }
    setCommsSending(true);
    try {
      const res = await dispatchEarthComms({ userState: state, evaluation, applyUpdatedState });
      setCommsSentAt(res.sentAt);
      setLastCommsResult(res);
      if (activeMissionSceneRef.current?.actionId !== 'comms') {
        showToast(res.copied ? 'Informe copiado y registrado' : 'Informe registrado');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar aviso';
      setCommsError(msg);
      if (activeMissionSceneRef.current?.actionId !== 'comms') {
        showToast(msg);
      }
    } finally {
      commsSendingRef.current = false;
      setCommsSending(false);
    }
  }

  function handleLoadReplayPoint(pt: NasaTimelinePoint, priorObs: PriorObservationInput[], pts: NasaTimelinePoint[]) {
    setNasaTimeline(pts);
    setNasaPriorObs(priorObs);
    setNasaObsId(pt.observation.observationId);
    resetCommsStatus();
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
    resetCommsStatus();
    showToast('Volviste a los datos de la misión');
  }

  async function handleResetDemo() {
    clearModesIfNeeded();
    setNasaObsId(null);
    setNasaPriorObs([]);
    setSaveMessage(null);
    resetCommsStatus();
    try {
      const next = await resetDemoState();
      setDraft(draftFromVitals(next.currentVitals));
      setContext(next.currentContext
        ? { ...next.currentContext, symptoms: [...next.currentContext.symptoms] }
        : { ...DEFAULT_CONTEXT, symptoms: [] });
      showToast('Datos de demostración restaurados (7 días)');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo restaurar la demostración.');
    }
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

  const baseMissions = state?.gamification.missions;
  const activeMissionsEval = tab === 'controls' ? null : missionsEvaluation;
  const missions = useMemo(() => {
    const list = [...(baseMissions ?? createDefaultMissions())];
    return tab === 'controls'
      ? list
      : applyClinicalRestrictionsToMissions(list, activeMissionsEval);
  }, [baseMissions, tab, activeMissionsEval]);

  return {
    state,
    authError,
    activeSimulation,
    activeNasaReplay,
    isSimulationOrReplay,
    tab,
    draft: displayedDraft,
    context: displayedContext,
    highlightedSys,
    nasaTimeline,
    nasaObsId,
    saving,
    saveMessage,
    completedLocalIds,
    hydrationLevel,
    exerciseStep,
    restNightActive,
    breathRounds,
    commsSending,
    commsSentAt,
    commsError,
    lastCommsResult,
    lastCommsCopied: lastCommsResult?.copied,
    toastMsg,
    stressMode,
    activeMissionScene,
    evaluation,
    activeVitals,
    missions,
    refreshState,
    login,
    logout,
    switchTab,
    setStressMode,
    openMissionScene,
    closeMissionScene,
    persistMissionCompletion,
    handleOpenBreather,
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
    handleAdvanceExercise,
    handleToggleRest,
    handleCompleteBreathRound,
    handlePingEarth,
    handleLoadReplayPoint,
    handleClearReplayOrSim,
    handleResetDemo,
    handleHighlightSystem,
    clearHighlight,
  };
}
