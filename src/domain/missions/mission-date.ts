export const DEFAULT_MISSION_TIMEZONE = 'America/Bogota';

/**
 * Calcula la clave de fecha calendario (YYYY-MM-DD) según la zona horaria del tripulante.
 */
export function getMissionDateKey(date: Date = new Date(), timeZone: string = DEFAULT_MISSION_TIMEZONE): string {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  try {
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(safeDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
      return formatted;
    }
  } catch {
    // Fallback a fecha desplazada UTC-5 si la zona horaria no es reconocida
  }
  const shifted = new Date(safeDate.getTime() - 5 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Calcula los días calendario entre dos claves YYYY-MM-DD.
 */
export function daysBetweenDateKeys(prevKey: string | null, nextKey: string | null): number {
  if (!prevKey || !nextKey) return Infinity;
  const msA = Date.parse(`${prevKey}T00:00:00Z`);
  const msB = Date.parse(`${nextKey}T00:00:00Z`);
  if (!Number.isFinite(msA) || !Number.isFinite(msB)) return Infinity;
  return Math.round((msB - msA) / 86_400_000);
}

/**
 * Actualiza el contador de racha diaria comparando la fecha previa con la fecha de misión actual.
 */
export function computeNextStreak(
  currentStreak: number,
  lastStreakDate: string | null,
  todayKey: string
): { streak: number; lastStreakDate: string } {
  if (!lastStreakDate) {
    return { streak: 1, lastStreakDate: todayKey };
  }
  const diff = daysBetweenDateKeys(lastStreakDate, todayKey);
  if (diff <= 0) {
    return { streak: Math.max(1, currentStreak), lastStreakDate };
  }
  if (diff === 1) {
    return { streak: currentStreak + 1, lastStreakDate: todayKey };
  }
  return { streak: 1, lastStreakDate: todayKey };
}
