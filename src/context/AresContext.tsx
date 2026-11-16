'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SCENARIOS_META, type HealthEvaluation, type PartialVitalValues, type ScenarioId, type VitalValues } from '@/domain/health';
import type { NasaStudyId } from '@/domain/nasa/nasa-types';
import {
  apiCompleteMission,
  apiGetState,
  apiResetDemoState,
  apiResetMissions,
  apiRunScenario,
} from '@/lib/client-api';
import { createDemoLocalState } from '@/lib/local-state';
import { getMissionDateKey } from '@/domain/missions/mission-date';
import type { NasaTimelinePoint } from '@/server/repositories/nasa-datasets-repo';
import type { PublicUserState } from '@/server/storage/types';

export interface ActiveSimulation {
  id: ScenarioId;
  label: string;
  vitals: VitalValues;
  evaluation: HealthEvaluation;
}

export interface ActiveNasaReplay {
  subjectId: string;
  studyId: NasaStudyId;
  cohortGroup: string;
  relativeLabel: string;
  vitals: PartialVitalValues;
  evaluation: HealthEvaluation;
}

interface AresContextValue {
  state: PublicUserState | null;
  loading: boolean;
  authError: string | null;
  activeSimulation: ActiveSimulation | null;
  activeNasaReplay: ActiveNasaReplay | null;
  nasaTimeline: NasaTimelinePoint[] | null;
  simulatorOpen: boolean;
  commsOpen: boolean;
  commsDraftMessage: string;
  refreshState: () => Promise<void>;
  resetDemoState: () => Promise<PublicUserState>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: { name: string; username: string; email?: string; role?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  applyUpdatedState: (next: PublicUserState) => void;
  runSimulation: (id: ScenarioId) => Promise<boolean>;
  clearSimulation: () => void;
  activateNasaReplay: (replay: ActiveNasaReplay) => void;
  clearNasaReplay: () => void;
  setNasaTimeline: (timeline: NasaTimelinePoint[] | null) => void;
  setSimulatorOpen: (open: boolean) => void;
  openCommsWithMessage: (message: string) => void;
  closeComms: () => void;
  completeMission: (missionId: string) => Promise<{ awardedXp: number; alreadyAwardedToday: boolean }>;
  resetMissions: () => Promise<void>;
}

const AresContext = createContext<AresContextValue | null>(null);

export function AresProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PublicUserState | null>(() => createDemoLocalState());
  const stateRef = useRef<PublicUserState | null>(state);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<ActiveSimulation | null>(null);
  const simulationRequest = useRef(0);
  const [activeNasaReplay, setActiveNasaReplay] = useState<ActiveNasaReplay | null>(null);
  const [nasaTimeline, setNasaTimeline] = useState<NasaTimelinePoint[] | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [commsOpen, setCommsOpen] = useState(false);
  const [commsDraftMessage, setCommsDraftMessage] = useState('');

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refreshState = useCallback(async () => {
    try {
      const next = await apiGetState();
      setState(next);
      setAuthError(null);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'No se pudieron cargar los datos locales.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  useEffect(() => {
    const refreshOnNewMissionDay = () => {
      const lastResetDate = stateRef.current?.gamification.lastResetDate;
      if (lastResetDate && lastResetDate !== getMissionDateKey()) {
        void refreshState();
      }
    };
    const interval = window.setInterval(refreshOnNewMissionDay, 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshOnNewMissionDay();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', refreshOnNewMissionDay);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', refreshOnNewMissionDay);
    };
  }, [refreshState]);

  const clearSimulation = useCallback(() => {
    simulationRequest.current++;
    setActiveSimulation(null);
  }, []);

  const login = useCallback(
    async (_identifier?: string, _password?: string) => {
      clearSimulation();
      setActiveNasaReplay(null);
      setNasaTimeline(null);
      await refreshState();
    },
    [clearSimulation, refreshState]
  );

  const register = useCallback(
    async (_payload?: { name: string; username: string; email?: string; role?: string; password: string }) => {
      clearSimulation();
      setActiveNasaReplay(null);
      setNasaTimeline(null);
      await refreshState();
    },
    [clearSimulation, refreshState]
  );

  const logout = useCallback(async () => {
    clearSimulation();
    setActiveNasaReplay(null);
    setNasaTimeline(null);
    setSimulatorOpen(false);
    setCommsOpen(false);
    await refreshState();
  }, [clearSimulation, refreshState]);

  const runSimulation = useCallback(async (id: ScenarioId) => {
    const request = ++simulationRequest.current;
    try {
      const result = await apiRunScenario(id);
      if (request !== simulationRequest.current) return false;
      const label = stateRef.current?.scenarios[id]?.label ?? SCENARIOS_META[id]?.label ?? `Escenario ${id}`;
      setActiveNasaReplay(null);
      setNasaTimeline(null);
      setActiveSimulation({ id, label, vitals: result.vitals, evaluation: result.evaluation });
      return true;
    } catch (error) {
      if (request !== simulationRequest.current) return false;
      throw error;
    }
  }, []);

  const activateNasaReplay = useCallback((replay: ActiveNasaReplay) => {
    clearSimulation();
    setActiveNasaReplay(replay);
  }, [clearSimulation]);

  const clearNasaReplay = useCallback(() => {
    setActiveNasaReplay(null);
    setNasaTimeline(null);
  }, []);

  const openCommsWithMessage = useCallback((message: string) => {
    setCommsDraftMessage(message);
    setCommsOpen(true);
  }, []);

  const closeComms = useCallback(() => {
    setCommsOpen(false);
  }, []);

  const completeMission = useCallback(async (missionId: string) => {
    const res = await apiCompleteMission(missionId);
    setState(res.state);
    return { awardedXp: res.awardedXp, alreadyAwardedToday: res.alreadyAwardedToday };
  }, []);

  const resetMissions = useCallback(async () => {
    const res = await apiResetMissions();
    setState(res.state);
  }, []);

  const resetDemoState = useCallback(async () => {
    clearSimulation();
    setActiveNasaReplay(null);
    setNasaTimeline(null);
    const next = await apiResetDemoState();
    setState(next);
    setAuthError(null);
    return next;
  }, [clearSimulation]);

  const value = useMemo<AresContextValue>(
    () => ({
      state,
      loading,
      authError,
      activeSimulation,
      activeNasaReplay,
      nasaTimeline,
      simulatorOpen,
      commsOpen,
      commsDraftMessage,
      refreshState,
      resetDemoState,
      login,
      register,
      logout,
      applyUpdatedState: setState,
      runSimulation,
      clearSimulation,
      activateNasaReplay,
      clearNasaReplay,
      setNasaTimeline,
      setSimulatorOpen,
      openCommsWithMessage,
      closeComms,
      completeMission,
      resetMissions,
    }),
    [
      state,
      loading,
      authError,
      activeSimulation,
      activeNasaReplay,
      nasaTimeline,
      simulatorOpen,
      commsOpen,
      commsDraftMessage,
      refreshState,
      resetDemoState,
      login,
      register,
      logout,
      runSimulation,
      clearSimulation,
      activateNasaReplay,
      clearNasaReplay,
      openCommsWithMessage,
      closeComms,
      completeMission,
      resetMissions,
    ]
  );

  return <AresContext.Provider value={value}>{children}</AresContext.Provider>;
}

export function useAres(): AresContextValue {
  const ctx = useContext(AresContext);
  if (!ctx) throw new Error('useAres debe utilizarse dentro de <AresProvider>.');
  return ctx;
}
