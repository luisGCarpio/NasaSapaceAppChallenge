export const XP_PER_LEVEL = 100;

export type MissionIconKey = 'droplet' | 'activity' | 'moon' | 'wind';

export interface MissionItem {
  id: string;
  title: string;
  iconKey: MissionIconKey;
  xpReward: number;
  completed: boolean;
  lastAwardedDate: string | null;
}

export interface GamificationState {
  xp: number;
  level: number;
  xpForNextLevel: number;
  xpProgressInLevel: number;
  streak: number;
  lastStreakDate: string | null;
  lastResetDate: string | null;
  missions: MissionItem[];
}

export const BASE_MISSIONS: readonly MissionItem[] = [
  { id: 'hydrate', title: 'Hidratarse (Beber agua)', iconKey: 'droplet', xpReward: 25, completed: false, lastAwardedDate: null },
  { id: 'exercise', title: 'Ejercicio / Estiramiento (30 min)', iconKey: 'activity', xpReward: 50, completed: false, lastAwardedDate: null },
  { id: 'rest', title: 'Descanso / Dormir (7-9h)', iconKey: 'moon', xpReward: 30, completed: false, lastAwardedDate: null },
  { id: 'breathe', title: 'Respiración / Pausa mental (5 min)', iconKey: 'wind', xpReward: 25, completed: false, lastAwardedDate: null },
];

export function createDefaultMissions(): MissionItem[] {
  return BASE_MISSIONS.map((mission) => ({ ...mission }));
}

export function createInitialGamification(): GamificationState {
  return {
    xp: 0,
    level: 1,
    xpForNextLevel: XP_PER_LEVEL,
    xpProgressInLevel: 0,
    streak: 0,
    lastStreakDate: null,
    lastResetDate: null,
    missions: createDefaultMissions(),
  };
}
