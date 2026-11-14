'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAres } from '@/context/AresContext';
import { DEFAULT_CONTEXT, evaluateHealth, SCENARIOS, SCENARIOS_META, type ScenarioId, type SystemId } from '@/domain/health';
import type { PriorObservationInput } from '@/domain/health/context-specs';
import { createDefaultMissions } from '@/domain/missions/mission-catalog';
import { applyClinicalRestrictionsToMissions } from '@/domain/missions/mission-safety';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import type { NasaTimelinePoint } from '@/server/repositories/nasa-datasets-repo';
import {
  applyMoodToDraft, applyNumericToDraft, bpmToCssDuration, dispatchEarthComms,
  mapObservationsToPrior, submitStudioCheckin, toggleDraftMeasure, type NumericVitalField,
} from './studio-actions';
import {
  createCleanDraft, draftFromVitals, draftToPartialVitals, SYSTEM_TO_TARGET,
  type StudioDraft, type TabKey, type VitalToggleKey,
} from './studio-types';
import { STUDIO_NAV_ITEMS } from './StudioNavSvg';

export function useAresStudio(initialTab: TabKey) {
  const {
    state, activeSimulation, activeNasaReplay, login, logout, applyUpdatedState,
    runSimulation, clearSimulation, activateNasaReplay, clearNasaReplay, completeMission, resetMissions,
  } = useAres();

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [draft, setDraft] = useState<StudioDraft>(() => createCleanDraft());
  const [context, setContext] = useState<ObservationContext>(() => ({ ...DEFAULT_CONTEXT }));
  const [highlightedSys, setHighlightedSys] = useState<SystemId | null>(null);
  const [nasaTimeline, setNasaTimeline] = useState<NasaTimelinePoint[] | null>(null);
  const [nasaPriorObs, setNasaPriorObs] = useState<PriorObservationInput[]>([]);
  const [nasaObsId, setNasaObsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [completedLocalIds, setCompletedLocalIds] = useState<string[]>([]);
  const [commsSending, setCommsSending] = useState(false);
  const [commsSentAt, setCommsSentAt] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [breathOpen, setBreathOpen] = useState(false);
  const [breathSec, setBreathSec] = useState(10);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeNasaReplay || activeSimulation) return;
    setDraft(draftFromVitals(state?.currentVitals ?? null));
    setContext(state?.currentContext ? { ...state.currentContext } : { ...DEFAULT_CONTEXT });
  }, [state?.user.id, state?.currentVitals, state?.currentContext, activeNasaReplay, activeSimulation]);

  const userPriorObservations = useMemo(() => mapObservationsToPrior(state?.observations ?? []), [state?.observations]);
  const partialVitals = useMemo(() => draftToPartialVitals(draft), [draft]);

  const evaluation = useMemo(() => {
    if (activeNasaReplay) return activeNasaReplay.evaluation;
    if (activeSimulation) return activeSimulation.evaluation;
    return evaluateHealth(partialVitals, { context, priorObservations: nasaObsId ? nasaPriorObs : userPriorObservations });
  }, [activeNasaReplay, activeSimulation, partialVitals, context, nasaObsId, nasaPriorObs, userPriorObservations]);

  const activeVitals = activeNasaReplay ? activeNasaReplay.vitals : activeSimulation ? activeSimulation.vitals : partialVitals;

  useEffect(() => {
    document.documentElement.style.setProperty('--bpm-duration', bpmToCssDuration(activeVitals.heart_rate));
  }, [activeVitals.heart_rate]);

  useEffect(() => {
    if (!breathOpen) return;
    if (breathSec <= 0) {
      setBreathOpen(false);
      void handleCompleteMission('breathe');
      return;
    }
    const timer = setTimeout(() => setBreathSec((s) => s - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breathOpen, breathSec]);

  function showToast(msg: string) {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2800);
  }

  function switchTab(next: TabKey) {
    setTab(next);
    const meta = STUDIO_NAV_ITEMS.find((i) => i.key === next);
    if (meta && typeof window !== 'undefined') window.history.replaceState(null, '', meta.href);
  }

  function clearModesIfNeeded() {
    if (activeSimulation) clearSimulation();
    if (activeNasaReplay) {
      clearNasaReplay();
      setNasaObsId(null);
      setNasaPriorObs([]);
    }
  }

  function handleUpdateNumeric(field: NumericVitalField, value: number) {
    clearModesIfNeeded();
    setSaveMessage(null);
    setDraft((prev) => applyNumericToDraft(prev, field, value));
  }

  function handleUpdateMood(idx: number) {
    clearModesIfNeeded();
    setSaveMessage(null);
    setDraft((prev) => applyMoodToDraft(prev, idx));
  }

  function handleToggleMeasured(key: VitalToggleKey) {
    clearModesIfNeeded();
    setSaveMessage(null);
    setDraft((prev) => toggleDraftMeasure(prev, key));
  }

  function handleChangeContext<K extends keyof ObservationContext>(key: K, val: ObservationContext[K]) {
    clearModesIfNeeded();
    setSaveMessage(null);
    setContext((prev) => ({ ...prev, [key]: val }));
  }

  async function handleRunScenario(id: ScenarioId) {
    setNasaObsId(null);
    setNasaPriorObs([]);
    setSaveMessage(null);
    setDraft(draftFromVitals(SCENARIOS[id]));
    setContext({ ...SCENARIOS_META[id].context });
    await runSimulation(id);
    showToast(`🧪 ${SCENARIOS_META[id].label}`);
  }

  function handleClearAllMeasured() {
    clearModesIfNeeded();
    setSaveMessage(null);
    setDraft(createCleanDraft());
    setContext({ ...DEFAULT_CONTEXT });
    showToast('↺ Controles reiniciados (0/7 sin datos inventados)');
  }

  async function handleSaveCheckin() {
    if (saving) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const msg = await submitStudioCheckin({ userState: state, evaluation, partialVitals, context, applyUpdatedState });
      setSaveMessage(msg);
      if (msg.ok) showToast('💾 Toma guardada en bitácora');
    } catch (err) {
      setSaveMessage({ ok: false, text: err instanceof Error ? err.message : 'Error guardando toma' });
    } finally {
      setSaving(false);
    }
  }

  async function handleCompleteMission(missionId: string) {
    if (missionId === 'exercise' && evaluation.clinicalRestrictions.restrictStrenuousExercise) {
      showToast('⚠️ Ejercicio bloqueado por alerta clínica activa');
      return;
    }
    if (state) {
      try {
        const res = await completeMission(missionId);
        showToast(res.alreadyAwardedToday ? '✓ Misión ya completada hoy' : `🛡️ +${res.awardedXp} XP ganados`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error completando misión');
      }
      return;
    }
    setCompletedLocalIds((prev) => (prev.includes(missionId) ? prev : [...prev, missionId]));
    showToast('✓ Vista previa (inicia sesión para guardar XP real)');
  }

  async function handlePingEarth() {
    setCommsSending(true);
    try {
      const res = await dispatchEarthComms({ userState: state, evaluation, applyUpdatedState });
      setCommsSentAt(res.sentAt);
      showToast(res.copied ? '📡 Aviso copiado y registrado' : '📡 Aviso registrado en bitácora');
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
    setDraft(draftFromVitals(pt.observation.vitals));
    setContext({ ...pt.observation.context });
    activateNasaReplay({
      subjectId: pt.observation.subjectId, studyId: pt.observation.studyId,
      cohortGroup: pt.observation.cohortGroup, relativeLabel: pt.observation.relativeLabel,
      vitals: pt.observation.vitals, evaluation: pt.evaluation,
    });
    switchTab('astro');
    showToast(`🛰️ Cargado ${pt.observation.subjectId} (${pt.observation.relativeLabel})`);
  }

  function handleClearReplayOrSim() {
    clearSimulation();
    clearNasaReplay();
    setNasaObsId(null);
    setNasaPriorObs([]);
    setDraft(draftFromVitals(state?.currentVitals ?? null));
    setContext(state?.currentContext ? { ...state.currentContext } : { ...DEFAULT_CONTEXT });
    showToast('📋 Regresaste a tu bitácora personal');
  }

  function handleHighlightSystem(sys: SystemId) {
    setHighlightedSys(sys);
    switchTab('controls');
    setTimeout(() => document.getElementById(SYSTEM_TO_TARGET[sys])?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }

  const missions = useMemo(
    () => applyClinicalRestrictionsToMissions([...(state?.gamification.missions ?? createDefaultMissions())], evaluation),
    [state?.gamification.missions, evaluation]
  );

  return {
    state, activeSimulation, activeNasaReplay, tab, draft, context, highlightedSys, nasaTimeline, nasaObsId,
    saving, saveMessage, completedLocalIds, commsSending, commsSentAt, toastMsg, breathOpen, breathSec,
    evaluation, activeVitals, missions, login, logout, switchTab, setBreathOpen, setBreathSec,
    setCompletedLocalIds, resetMissions, handleUpdateNumeric, handleUpdateMood, handleToggleMeasured,
    handleChangeContext, handleRunScenario, handleClearAllMeasured, handleSaveCheckin,
    handleCompleteMission, handlePingEarth, handleLoadReplayPoint, handleClearReplayOrSim, handleHighlightSystem,
  };
}
