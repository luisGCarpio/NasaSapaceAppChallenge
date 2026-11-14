'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { HealthEvaluation, PartialVitalValues, ScenarioId, VitalValues } from '@/domain/health';
import type { NasaStudyId } from '@/domain/nasa/nasa-types';
import {
  ApiError,
  apiCompleteMission,
  apiGetState,
  apiLogin,
  apiLogout,
  apiRegister,
  apiResetMissions,
  apiRunScenario,
} from '@/lib/client-api';
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
  simulatorOpen: boolean;
  commsOpen: boolean;
  commsDraftMessage: string;
  refreshState: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: { name: string; username: string; email?: string; role?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  applyUpdatedState: (next: PublicUserState) => void;
  runSimulation: (id: ScenarioId) => Promise<void>;
  clearSimulation: () => void;
  activateNasaReplay: (replay: ActiveNasaReplay) => void;
  clearNasaReplay: () => void;
  setSimulatorOpen: (open: boolean) => void;
  openCommsWithMessage: (message: string) => void;
  closeComms: () => void;
  completeMission: (missionId: string) => Promise<{ awardedXp: number; alreadyAwardedToday: boolean }>;
  resetMissions: () => Promise<void>;
}

const AresContext = createContext<AresContextValue | null>(null);

export function AresProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PublicUserState | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<ActiveSimulation | null>(null);
  const [activeNasaReplay, setActiveNasaReplay] = useState<ActiveNasaReplay | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [commsOpen, setCommsOpen] = useState(false);
  const [commsDraftMessage, setCommsDraftMessage] = useState('');

  const refreshState = useCallback(async () => {
    setLoading(true);
    try {
      const next = await apiGetState();
      setState(next);
      setAuthError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setState(null);
      } else {
        setAuthError(err instanceof Error ? err.message : 'No se pudo cargar el estado.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const login = useCallback(async (identifier: string, password: string) => {
    setAuthError(null);
    const result = await apiLogin({ identifier, password });
    setActiveSimulation(null);
    setActiveNasaReplay(null);
    setState(result.state);
  }, []);

  const register = useCallback(
    async (payload: { name: string; username: string; email?: string; role?: string; password: string }) => {
      setAuthError(null);
      const result = await apiRegister(payload);
      setActiveSimulation(null);
      setActiveNasaReplay(null);
      setState(result.state);
    },
    []
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setActiveSimulation(null);
    setActiveNasaReplay(null);
    setSimulatorOpen(false);
    setCommsOpen(false);
    setState(null);
  }, []);

  const runSimulation = useCallback(
    async (id: ScenarioId) => {
      const result = await apiRunScenario(id);
      const label = state?.scenarios[id]?.label ?? `Escenario ${id}`;
      setActiveNasaReplay(null);
      setActiveSimulation({ id, label, vitals: result.vitals, evaluation: result.evaluation });
    },
    [state]
  );

  const clearSimulation = useCallback(() => {
    setActiveSimulation(null);
  }, []);

  const activateNasaReplay = useCallback((replay: ActiveNasaReplay) => {
    setActiveSimulation(null);
    setActiveNasaReplay(replay);
  }, []);

  const clearNasaReplay = useCallback(() => {
    setActiveNasaReplay(null);
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

  return (
    <AresContext.Provider
      value={{
        state,
        loading,
        authError,
        activeSimulation,
        activeNasaReplay,
        simulatorOpen,
        commsOpen,
        commsDraftMessage,
        refreshState,
        login,
        register,
        logout,
        applyUpdatedState: setState,
        runSimulation,
        clearSimulation,
        activateNasaReplay,
        clearNasaReplay,
        setSimulatorOpen,
        openCommsWithMessage,
        closeComms,
        completeMission,
        resetMissions,
      }}
    >
      {children}
    </AresContext.Provider>
  );
}

export function useAres(): AresContextValue {
  const ctx = useContext(AresContext);
  if (!ctx) throw new Error('useAres debe utilizarse dentro de <AresProvider>.');
  return ctx;
}
