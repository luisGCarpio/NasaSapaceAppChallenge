'use client';

import { AresIcon } from '@/components/ui/Icons';
import { COMMON_SYMPTOMS } from '@/domain/health/context-specs';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import type { PublicUserState } from '@/server/storage/types';

interface ContextAndSaveCardProps {
  context: ObservationContext;
  userState: PublicUserState | null;
  saving: boolean;
  saveMessage: { ok: boolean; text: string } | null;
  canSaveCount: number;
  isSimulationOrReplay: boolean;
  onChangeContext: <K extends keyof ObservationContext>(key: K, val: ObservationContext[K]) => void;
  onSaveCheckin: () => void;
  onClearAllMeasured?: () => void;
}

export function ContextAndSaveCard({
  context,
  userState,
  saving,
  saveMessage,
  canSaveCount,
  isSimulationOrReplay,
  onChangeContext,
  onSaveCheckin,
  onClearAllMeasured,
}: ContextAndSaveCardProps) {
  const toggleSymptom = (sym: string) => {
    const next = context.symptoms.includes(sym)
      ? context.symptoms.filter((s) => s !== sym)
      : [...context.symptoms, sym];
    onChangeContext('symptoms', next);
  };

  const saveHelperText = !userState
    ? 'Cargando bitácora local para guardar...'
    : isSimulationOrReplay
      ? 'Modo simulación: los datos de prueba no se guardan en tu historial.'
      : canSaveCount === 0
        ? 'Activa al menos 1 indicador para guardar.'
        : null;

  return (
    <div className="system-group" id="group-context">
      <div className="group-head">
        <h2 className="group-head-left">
          <AresIcon name="sliders" size={20} />
          <span>Contexto y síntomas</span>
        </h2>
      </div>

      <details className="context-disclosure">
        <summary>
          <span className="context-disclosure-title">
            <span>Contexto y síntomas (opcional)</span>
          </span>
          <span className="details-cue" aria-hidden="true">Abrir</span>
        </summary>

        <div className="context-disclosure-body">
          <div className="context-grid">
            <div className="context-field">
              <label htmlFor="ctx-activity" className="context-label">
                Actividad / Esfuerzo
              </label>
              <select
                id="ctx-activity"
                className="context-select"
                value={context.activityState}
                onChange={(e) => onChangeContext('activityState', e.target.value as ObservationContext['activityState'])}
              >
                <option value="rest">Reposo (&gt;= 5 min)</option>
                <option value="post_exercise">Post-esfuerzo físico</option>
                <option value="orthostatic_tilt">Prueba ortostática Tilt</option>
                <option value="eva">Actividad extravehicular (EVA)</option>
              </select>
            </div>

            <div className="context-field">
              <label htmlFor="ctx-posture" className="context-label">
                Postura de toma
              </label>
              <select
                id="ctx-posture"
                className="context-select"
                value={context.posture}
                onChange={(e) => onChangeContext('posture', e.target.value as ObservationContext['posture'])}
              >
                <option value="seated">Sentado</option>
                <option value="supine">Acostado (supino)</option>
                <option value="standing_tilt">De pie / Tilt</option>
                <option value="unknown">No especificada</option>
              </select>
            </div>

            <div className="context-field">
              <label htmlFor="ctx-glucose-timing" className="context-label">
                Ayuno / Glucemia
              </label>
              <select
                id="ctx-glucose-timing"
                className="context-select"
                value={context.glucoseTiming}
                onChange={(e) => onChangeContext('glucoseTiming', e.target.value as ObservationContext['glucoseTiming'])}
              >
                <option value="unknown">Sin especificar</option>
                <option value="fasting">En ayunas (&gt;= 8 h)</option>
                <option value="post_meal">Postprandial (&lt; 2 h)</option>
                <option value="random">Muestra aleatoria</option>
              </select>
            </div>

            <div className="context-field">
              <label htmlFor="ctx-temp-method" className="context-label">
                Método temperatura
              </label>
              <select
                id="ctx-temp-method"
                className="context-select"
                value={context.tempMethod}
                onChange={(e) => onChangeContext('tempMethod', e.target.value as ObservationContext['tempMethod'])}
              >
                <option value="oral">Oral</option>
                <option value="tympanic">Timpánica</option>
                <option value="core_sensor">Sensor central</option>
                <option value="unknown">No especificado</option>
              </select>
            </div>
          </div>

          <div className="context-repeat-row">
            <label htmlFor="ctx-confirmed-repeated" className="context-checkbox-label">
              <input
                id="ctx-confirmed-repeated"
                type="checkbox"
                checked={context.confirmedRepeated}
                onChange={(e) => onChangeContext('confirmedRepeated', e.target.checked)}
              />
              <span>Lectura repetida para confirmar</span>
            </label>
          </div>

          <div>
            <p id="ctx-symptoms-label" className="context-symptoms-label">
              Síntomas
            </p>
            <div className="chip-row" role="group" aria-labelledby="ctx-symptoms-label">
              {[...new Set([...COMMON_SYMPTOMS, ...context.symptoms])].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  className={`chip-toggle${context.symptoms.includes(sym) ? ' active' : ''}`}
                  aria-pressed={context.symptoms.includes(sym)}
                  onClick={() => toggleSymptom(sym)}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>
        </div>
      </details>

      <div className="save-action-bar">
        <div className="save-action-buttons">
          <button
            type="button"
            className="btn-tactile save-primary-btn"
            style={{ background: 'var(--periwinkle-dark)', color: '#FFF' }}
            disabled={!userState || saving || canSaveCount === 0 || isSimulationOrReplay}
            onClick={onSaveCheckin}
          >
            <AresIcon name="clipboard" size={18} /> {saving ? 'Guardando...' : 'Guardar medición'}
          </button>
          {canSaveCount > 0 && onClearAllMeasured ? (
            <button type="button" className="btn-tactile" onClick={onClearAllMeasured}>
              <AresIcon name="sync" size={16} /> Limpiar
            </button>
          ) : null}
        </div>
        {saveHelperText ? <p className="save-helper-copy">{saveHelperText}</p> : null}
      </div>

      {saveMessage && !saveMessage.ok ? (
        <p role="alert" aria-live="assertive" className="save-error-banner">
          {saveMessage.text}
        </p>
      ) : null}
    </div>
  );
}
