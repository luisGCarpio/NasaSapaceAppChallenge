import { prefersReducedMotionSafe } from './gravity-reentry-machine';

export type MissionActionId = 'hydrate' | 'exercise' | 'rest' | 'breathe' | 'comms';

export type MissionSceneModalPhase = 'closed' | 'animating' | 'tablet';

export type MissionSceneStateVariant = 'normal' | 'blocked';

export const MISSION_SCENE_DURATION_MS = 1800;
export const BREATH_SCENE_DURATION_MS = 4500;
export const MISSION_TABLET_REVEAL_MS = 240;

export { prefersReducedMotionSafe };

export function shouldOpenMissionModal(missionId: string): boolean {
  void missionId;
  return false;
}

/**
 * Returns the target scene animation duration for a given mission/comms action.
 * Standard actions match the gravity reference (1800 ms); breathing uses a calm 4500 ms cycle.
 */
export function getMissionSceneDurationMs(actionId: MissionActionId): number {
  return actionId === 'breathe' ? BREATH_SCENE_DURATION_MS : MISSION_SCENE_DURATION_MS;
}

/**
 * Resolves the initial modal phase when launching a mission or comms scene.
 */
export function getInitialMissionModalPhase(
  variant: MissionSceneStateVariant,
  reducedMotion: boolean
): Exclude<MissionSceneModalPhase, 'closed'> {
  if (reducedMotion || variant === 'blocked') {
    return 'tablet';
  }
  return 'animating';
}

/**
 * Computes the breathing guidance label for a normalized progress [0..1] across the 4.5s cycle.
 */
export function getBreathPhaseLabel(progress: number): string {
  if (progress < 0.34) return 'Inhala suave...';
  if (progress < 0.62) return 'Sostén...';
  return 'Exhala lento...';
}

export interface MissionSceneControllerOptions<TTimer = ReturnType<typeof setTimeout>> {
  setTimer?: (callback: () => void, delayMs: number) => TTimer;
  clearTimer?: (timerId: TTimer) => void;
  getDurationMs?: (actionId: MissionActionId) => number;
  onPhaseChange?: (phase: MissionSceneModalPhase) => void;
}

export interface MissionSceneController {
  getPhase: () => MissionSceneModalPhase;
  open: (
    actionId: MissionActionId,
    variant: MissionSceneStateVariant,
    reducedMotion: boolean
  ) => MissionSceneModalPhase;
  skip: () => MissionSceneModalPhase;
  replay: (
    actionId: MissionActionId,
    variant: MissionSceneStateVariant,
    reducedMotion: boolean
  ) => MissionSceneModalPhase;
  close: () => MissionSceneModalPhase;
  dispose: () => void;
}

/**
 * Pure state machine controller for mission/comms launch scenes.
 * Cancels pending timers before transitions and ignores stale callbacks via generation tokens.
 */
export function createMissionSceneController<TTimer = ReturnType<typeof setTimeout>>(
  options: MissionSceneControllerOptions<TTimer> = {}
): MissionSceneController {
  const setTimer =
    options.setTimer ??
    ((callback: () => void, delayMs: number) =>
      globalThis.setTimeout(callback, delayMs) as unknown as TTimer);
  const clearTimer =
    options.clearTimer ??
    ((timerId: TTimer) => {
      globalThis.clearTimeout(timerId as unknown as ReturnType<typeof setTimeout>);
    });
  const getDurationMs = options.getDurationMs ?? getMissionSceneDurationMs;
  const onPhaseChange = options.onPhaseChange;

  let phase: MissionSceneModalPhase = 'closed';
  let activeTimer: TTimer | null = null;
  let generation = 0;

  function cancelActiveTimer(): void {
    if (activeTimer !== null) {
      clearTimer(activeTimer);
      activeTimer = null;
    }
  }

  function transitionTo(nextPhase: MissionSceneModalPhase): void {
    if (phase !== nextPhase) {
      phase = nextPhase;
      onPhaseChange?.(nextPhase);
    }
  }

  function startPhase(
    actionId: MissionActionId,
    variant: MissionSceneStateVariant,
    reducedMotion: boolean
  ): MissionSceneModalPhase {
    generation += 1;
    cancelActiveTimer();

    const nextPhase = getInitialMissionModalPhase(variant, reducedMotion);
    transitionTo(nextPhase);

    if (nextPhase === 'animating') {
      const token = generation;
      const delayMs = getDurationMs(actionId);
      activeTimer = setTimer(() => {
        if (token !== generation || phase !== 'animating') {
          return;
        }
        activeTimer = null;
        transitionTo('tablet');
      }, delayMs);
    }

    return phase;
  }

  return {
    getPhase: () => phase,
    open: (actionId, variant, reducedMotion) => startPhase(actionId, variant, reducedMotion),
    skip: () => {
      if (phase === 'closed') return phase;
      generation += 1;
      cancelActiveTimer();
      transitionTo('tablet');
      return phase;
    },
    replay: (actionId, variant, reducedMotion) => startPhase(actionId, variant, reducedMotion),
    close: () => {
      generation += 1;
      cancelActiveTimer();
      transitionTo('closed');
      return phase;
    },
    dispose: () => {
      generation += 1;
      cancelActiveTimer();
      phase = 'closed';
    },
  };
}

export interface MissionSceneMetric {
  label: string;
  value: string;
  delta: string;
}

export interface MissionSceneCopy {
  modalTitle: string;
  pillText: string;
  announcementAnimating: string;
  announcementTablet: string;
  verdictClassName: 'verdict-go' | 'verdict-warn' | 'verdict-danger' | 'verdict-neutral';
  badge: string;
  headline: string;
  metrics: [MissionSceneMetric, MissionSceneMetric];
  actionsTitle: string;
  actions: string[];
  replayLabel: string;
}

export interface MissionSceneCopyContext {
  restrictionReason?: string | null;
  overallStatus?: string;
  readinessScore?: number | null;
  copiedToClipboard?: boolean;
  sentAt?: string | null;
  commsSending?: boolean;
  commsError?: string | null;
}

/**
 * Returns localized, XP-free copy and telemetry metrics for each mission/comms modal.
 */
export function getMissionSceneCopy(
  actionId: MissionActionId,
  variant: MissionSceneStateVariant,
  ctx: MissionSceneCopyContext = {}
): MissionSceneCopy {
  if (actionId === 'exercise' && variant === 'blocked') {
    const reason =
      ctx.restrictionReason?.trim() ||
      'Tus signos actuales indican evitar esfuerzo físico intenso por ahora.';
    return {
      modalTitle: 'Protocolo de seguridad activo',
      pillText: 'PAUSA CLÍNICA',
      announcementAnimating: 'Verificando seguridad física.',
      announcementTablet: 'Protocolo de seguridad activo para ejercicio.',
      verdictClassName: 'verdict-danger',
      badge: 'Ejercicio pausado por seguridad',
      headline: 'El entrenamiento intenso está bloqueado temporalmente para proteger tu estabilidad.',
      metrics: [
        { label: 'Carga física', value: 'En pausa', delta: 'Bloqueo preventivo' },
        { label: 'Motivo clínico', value: 'Alerta activa', delta: reason },
      ],
      actionsTitle: 'Qué puedes hacer ahora',
      actions: [
        reason,
        'Realiza una pausa de respiración en cabina o revisa tus signos en Controles.',
      ],
      replayLabel: 'Repetir',
    };
  }

  switch (actionId) {
    case 'hydrate':
      return {
        modalTitle: 'Tanque de reserva H2O',
        pillText: 'H2O · 100%',
        announcementAnimating: 'Llenando tanque de reserva hídrica del traje.',
        announcementTablet: 'Tanque de reserva hídrica completo.',
        verdictClassName: 'verdict-go',
        badge: 'Reserva hídrica sellada',
        headline: 'Tu volumen plasmático y soporte de cabina quedan estabilizados.',
        metrics: [
          { label: 'Tanque del traje', value: '0% → 100%', delta: 'Reserva óptima' },
          { label: 'Estado hídrico', value: 'Pendiente → Listo', delta: 'Protocolo diario activo' },
        ],
        actionsTitle: 'Recomendación orbital',
        actions: [
          'Mantén sorbos constantes durante el turno para sostener la presión al ponerte de pie.',
        ],
        replayLabel: 'Repetir',
      };

    case 'exercise':
      return {
        modalTitle: 'Propulsor ARED (1G)',
        pillText: 'CARGA 1G',
        announcementAnimating: 'Activando propulsor de resistencia muscular y ósea.',
        announcementTablet: 'Sesión de resistencia muscular completada.',
        verdictClassName: 'verdict-go',
        badge: 'Carga muscular completada',
        headline: 'Estímulo mecánico aplicado para contrarrestar la pérdida en microgravedad.',
        metrics: [
          { label: 'Tono muscular', value: 'Reposo → Activo', delta: 'Bloque 30 min registrado' },
          { label: 'Soporte óseo', value: '0G → Carga 1G', delta: 'Contramedida aplicada' },
        ],
        actionsTitle: 'Cierre de sesión',
        actions: [
          'Hidrata después del esfuerzo y evita levantarte de golpe si sientes fatiga.',
        ],
        replayLabel: 'Repetir',
      };

    case 'rest':
      return {
        modalTitle: 'Órbita nocturna',
        pillText: 'CICLO REM',
        announcementAnimating: 'Iniciando transición orbital nocturna de descanso.',
        announcementTablet: 'Ciclo de recuperación nocturna registrado.',
        verdictClassName: 'verdict-neutral',
        badge: 'Recuperación nocturna lista',
        headline: 'Tu ritmo circadiano y sistema nervioso entran en fase de recarga.',
        metrics: [
          { label: 'Modo de cabina', value: 'Día → Nocturno', delta: 'Ventana 7-9h objetivo' },
          { label: 'Recuperación', value: 'En pausa → Activa', delta: 'Descanso registrado hoy' },
        ],
        actionsTitle: 'Higiene orbital',
        actions: [
          'Reduce luz brillante antes de dormir para consolidar la recuperación cognitiva.',
        ],
        replayLabel: 'Repetir',
      };

    case 'breathe':
      return {
        modalTitle: 'Cabina de descompresión',
        pillText: '0G · CALMA',
        announcementAnimating: 'Iniciando ciclo guiado de respiración en cabina.',
        announcementTablet: 'Cabina de descompresión estabilizada.',
        verdictClassName: 'verdict-go',
        badge: 'Pausa mental completada',
        headline: 'Respiración regulada para bajar tensión autonómica y recuperar enfoque.',
        metrics: [
          { label: 'Ritmo de cabina', value: 'Acelerado → Estable', delta: 'Ciclo guiado completo' },
          { label: 'Pausa orbital', value: 'Pendiente → Lista', delta: 'Descompresión aplicada' },
        ],
        actionsTitle: 'Siguiente paso',
        actions: [
          'Si aún notas tensión, usa Repetir ciclo para realizar otra respiración guiada.',
        ],
        replayLabel: 'Repetir ciclo',
      };

    case 'comms': {
      const scoreText =
        typeof ctx.readinessScore === 'number' ? `${ctx.readinessScore}/100` : 'N/D';
      const statusText = ctx.overallStatus || 'Evaluado';

      if (ctx.commsError) {
        return {
          modalTitle: 'Transmisión satelital a Houston',
          pillText: 'ENLACE TIERRA',
          announcementAnimating: 'Transmitiendo informe médico hacia estación en Tierra.',
          announcementTablet: 'No se pudo registrar el informe en bitácora.',
          verdictClassName: 'verdict-danger',
          badge: 'Error al registrar enlace',
          headline: ctx.commsError,
          metrics: [
            { label: 'Estado e índice', value: `${statusText} · ${scoreText}`, delta: 'Sin registro confirmado' },
            { label: 'Entrega', value: 'Error al registrar', delta: 'Reintenta el envío' },
          ],
          actionsTitle: 'Detalle de transmisión',
          actions: [
            'Verifica la conexión o vuelve a pulsar Copiar y registrar informe.',
          ],
          replayLabel: 'Repetir',
        };
      }

      if (ctx.commsSending) {
        return {
          modalTitle: 'Transmisión satelital a Houston',
          pillText: 'ENLACE TIERRA',
          announcementAnimating: 'Transmitiendo informe médico hacia estación en Tierra.',
          announcementTablet: 'Sincronizando enlace y respaldo en bitácora.',
          verdictClassName: 'verdict-warn',
          badge: 'Sincronizando enlace...',
          headline: 'Guardando respaldo en tu bitácora y preparando entrega.',
          metrics: [
            { label: 'Estado e índice', value: `${statusText} · ${scoreText}`, delta: 'Envío en curso' },
            { label: 'Entrega', value: 'Sincronizando...', delta: 'Esperando confirmación' },
          ],
          actionsTitle: 'Detalle de transmisión',
          actions: [
            'Mantén esta ventana abierta mientras se confirma el respaldo en bitácora.',
          ],
          replayLabel: 'Repetir',
        };
      }

      const clipboardText =
        ctx.copiedToClipboard === false
          ? 'Guardado local'
          : ctx.copiedToClipboard === true
            ? 'Portapapeles y bitácora ✓'
            : 'Registrado en bitácora';
      const timeText = ctx.sentAt ? ctx.sentAt.slice(11, 16) : 'Hoy';

      return {
        modalTitle: 'Transmisión satelital a Houston',
        pillText: 'ENLACE TIERRA · 100%',
        announcementAnimating: 'Transmitiendo informe médico hacia estación en Tierra.',
        announcementTablet: 'Informe transmitido y registrado.',
        verdictClassName: 'verdict-go',
        badge: 'Enlace con Tierra confirmado',
        headline: 'Tu informe quedó listo para compartir y respaldado en tu bitácora.',
        metrics: [
          { label: 'Estado e índice', value: `${statusText} · ${scoreText}`, delta: `Registro ${timeText}` },
          { label: 'Entrega', value: clipboardText, delta: 'Respaldo local activo' },
        ],
        actionsTitle: 'Detalle de transmisión',
        actions: [
          'Puedes pegar el informe directamente en tu canal de seguimiento.',
        ],
        replayLabel: 'Repetir',
      };
    }
  }
}
