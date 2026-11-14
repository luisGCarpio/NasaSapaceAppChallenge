import { ALGORITHM_VERSION, evaluateHealth, type VitalValues } from '@/domain/health';
import { createDefaultMissions, XP_PER_LEVEL } from '@/domain/missions/mission-catalog';
import type { CheckinEntry, DbState, SyncMeta } from './types';

interface SeedDaySpec {
  id: string;
  dateKey: string;
  timestamp: string;
  vitals: VitalValues;
}

function buildSeedHistory(days: SeedDaySpec[]): CheckinEntry[] {
  return days.map((day) => {
    const evaluation = evaluateHealth(day.vitals);
    return {
      id: day.id,
      dateKey: day.dateKey,
      dayLabel: day.dateKey,
      timestamp: day.timestamp,
      updatesCount: 1,
      vitals: day.vitals,
      overallStatus: evaluation.overallStatus,
      readinessScore: evaluation.readinessScore,
      crossConclusionId: evaluation.crossConclusionId,
      algorithmVersion: ALGORITHM_VERSION,
      source: 'manual',
    };
  });
}

export function createDefaultSyncMeta(): SyncMeta {
  return {
    status: 'local_only',
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastHttpStatus: null,
    lastError: 'Sincronización remota con Supabase aún no verificada o tablas pendientes.',
    pendingCount: 0,
  };
}

const ELENA_DAYS: SeedDaySpec[] = [
  { id: 'elena-checkin-day-1', dateKey: '2026-11-10', timestamp: '2026-11-10T08:30:00.000Z', vitals: { sleep_hours: 7.5, mood: 'excelente', heart_rate: 66, bp_systolic: 116, bp_diastolic: 76, glucose: 90, temperature: 36.5 } },
  { id: 'elena-checkin-day-2', dateKey: '2026-11-11', timestamp: '2026-11-11T08:30:00.000Z', vitals: { sleep_hours: 7, mood: 'bien', heart_rate: 72, bp_systolic: 118, bp_diastolic: 78, glucose: 94, temperature: 36.6 } },
  { id: 'elena-checkin-day-3', dateKey: '2026-11-12', timestamp: '2026-11-12T08:30:00.000Z', vitals: { sleep_hours: 5.5, mood: 'cansado', heart_rate: 86, bp_systolic: 128, bp_diastolic: 84, glucose: 108, temperature: 36.9 } },
  { id: 'elena-checkin-day-4', dateKey: '2026-11-13', timestamp: '2026-11-13T08:30:00.000Z', vitals: { sleep_hours: 7, mood: 'bien', heart_rate: 74, bp_systolic: 120, bp_diastolic: 79, glucose: 96, temperature: 36.7 } },
  { id: 'elena-checkin-day-5', dateKey: '2026-11-14', timestamp: '2026-11-14T08:30:00.000Z', vitals: { sleep_hours: 8, mood: 'excelente', heart_rate: 68, bp_systolic: 115, bp_diastolic: 75, glucose: 88, temperature: 36.6 } },
];

const MARCO_DAYS: SeedDaySpec[] = [
  { id: 'marco-checkin-day-1', dateKey: '2026-11-10', timestamp: '2026-11-10T09:15:00.000Z', vitals: { sleep_hours: 7.2, mood: 'bien', heart_rate: 74, bp_systolic: 118, bp_diastolic: 78, glucose: 95, temperature: 36.6 } },
  { id: 'marco-checkin-day-2', dateKey: '2026-11-11', timestamp: '2026-11-11T09:15:00.000Z', vitals: { sleep_hours: 6.8, mood: 'bien', heart_rate: 76, bp_systolic: 120, bp_diastolic: 79, glucose: 99, temperature: 36.7 } },
  { id: 'marco-checkin-day-3', dateKey: '2026-11-12', timestamp: '2026-11-12T09:15:00.000Z', vitals: { sleep_hours: 5, mood: 'estresado', heart_rate: 92, bp_systolic: 132, bp_diastolic: 86, glucose: 115, temperature: 37.1 } },
  { id: 'marco-checkin-day-4', dateKey: '2026-11-13', timestamp: '2026-11-13T09:15:00.000Z', vitals: { sleep_hours: 6, mood: 'cansado', heart_rate: 85, bp_systolic: 127, bp_diastolic: 83, glucose: 110, temperature: 36.9 } },
  { id: 'marco-checkin-day-5', dateKey: '2026-11-14', timestamp: '2026-11-14T09:15:00.000Z', vitals: { sleep_hours: 6.2, mood: 'cansado', heart_rate: 84, bp_systolic: 126, bp_diastolic: 82, glucose: 108, temperature: 36.9 } },
];

export function createSeedDatabase(): DbState {
  const elenaHistory = buildSeedHistory(ELENA_DAYS);
  const marcoHistory = buildSeedHistory(MARCO_DAYS);

  return {
    users: {
      elena: {
        id: 'elena',
        username: 'elena',
        email: 'elena@nasa.gov',
        passwordHash: 'scrypt$5bde7602516abf1d29945d704004f6da$51b6e4b851248765c795770c0a9772dd38dce548d0670ad853f2d5394c67068e6cbe188a136e2f2856a6167c49881bd4ccb103ceb519e9f9f3a94d8f2950d233',
        name: 'Cmdr. Elena Vance',
        role: 'Comandante de Misión — Artemis',
        currentVitals: ELENA_DAYS[ELENA_DAYS.length - 1].vitals,
        lastCheckinAt: '2026-11-14T08:30:00.000Z',
        history: elenaHistory,
        commsLog: [],
        gamification: {
          xp: 120,
          level: 2,
          xpForNextLevel: XP_PER_LEVEL,
          xpProgressInLevel: 20,
          streak: 4,
          lastStreakDate: '2026-11-13',
          lastResetDate: '2026-11-14',
          missions: createDefaultMissions(),
        },
      },
      marco: {
        id: 'marco',
        username: 'marco',
        email: 'marco@nasa.gov',
        passwordHash: 'scrypt$5c2b10c09cbb43d70f18f3d46e0cd0f5$cadb2ab66414bf9ee3d5eb4c93a46b6df878074431ef8d4d9f9c8401c0fa6e8e2db3ac04a327bdd9451e9725e8bcae210601f53598a6102abf3d6ca1ab9292cf',
        name: 'Esp. Marco Silva',
        role: 'Especialista de Vuelo — Hábitat Lunar',
        currentVitals: MARCO_DAYS[MARCO_DAYS.length - 1].vitals,
        lastCheckinAt: '2026-11-14T09:15:00.000Z',
        history: marcoHistory,
        commsLog: [],
        gamification: {
          xp: 240,
          level: 3,
          xpForNextLevel: XP_PER_LEVEL,
          xpProgressInLevel: 40,
          streak: 7,
          lastStreakDate: '2026-11-13',
          lastResetDate: '2026-11-14',
          missions: createDefaultMissions(),
        },
      },
    },
    sessions: {},
    pendingSyncQueue: [],
    syncMeta: createDefaultSyncMeta(),
  };
}
