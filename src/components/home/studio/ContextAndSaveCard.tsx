'use client';

import { AresIcon } from '@/components/ui/Icons';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import type { PublicUserState } from '@/server/storage/types';
import { COMMON_SYMPTOMS } from '@/domain/health/context-specs';

interface ContextAndSaveCardProps {
  context: ObservationContext;
  userState: PublicUserState | null;
  saving: boolean;
  saveMessage: { ok: boolean; text: string } | null;
  canSaveCount: number;
  isSimulationOrReplay: boolean;
  onChangeContext: <K extends keyof ObservationContext>(key: K, val: ObservationContext[K]) => void;
  onSaveCheckin: () => void;
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
}: ContextAndSaveCardProps) {
  const toggleSymptom = (sym: string) => {
    const next = context.symptoms.includes(sym)
      ? context.symptoms.filter((s) => s !== sym)
      : [...context.symptoms, sym];
    onChangeContext('symptoms', next);
  };

  return (
    <div className="system-group" id="group-context">
      <div className="group-head">
        <div className="group-head-left">
          <AresIcon name="sliders" size={20} /><span>Contexto de la medición</span>
        </div>
        <span className="val-pill">{canSaveCount}/7 medidos</span>
      </div>

      <div className="context-grid">
        <label style={{ fontSize: '0.9rem', fontWeight: 700 }}>
          Actividad / Esfuerzo
          <select
            className="context-select"
            value={context.activityState}
            onChange={(e) => onChangeContext('activityState', e.target.value as ObservationContext['activityState'])}
          >
            <option value="rest">Reposo (&gt;= 5 min)</option>
            <option value="post_exercise">Post-esfuerzo físico</option>
            <option value="orthostatic_tilt">Prueba ortostática Tilt</option>
            <option value="eva">Actividad extravehicular (EVA)</option>
          </select>
        </label>

        <label style={{ fontSize: '0.9rem', fontWeight: 700 }}>
          Postura de toma
          <select
            className="context-select"
            value={context.posture}
            onChange={(e) => onChangeContext('posture', e.target.value as ObservationContext['posture'])}
          >
            <option value="seated">Sentado</option>
            <option value="supine">Acostado (supino)</option>
            <option value="standing_tilt">De pie / Tilt</option>
            <option value="unknown">No especificada</option>
          </select>
        </label>

        <label style={{ fontSize: '0.9rem', fontWeight: 700 }}>
          Ayuno / Glucemia
          <select
            className="context-select"
            value={context.glucoseTiming}
            onChange={(e) => onChangeContext('glucoseTiming', e.target.value as ObservationContext['glucoseTiming'])}
          >
            <option value="unknown">Sin especificar</option>
            <option value="fasting">En ayunas (&gt;= 8 h)</option>
            <option value="post_meal">Postprandial (&lt; 2 h)</option>
            <option value="random">Muestra aleatoria</option>
          </select>
        </label>

        <label style={{ fontSize: '0.9rem', fontWeight: 700 }}>
          Método temperatura
          <select
            className="context-select"
            value={context.tempMethod}
            onChange={(e) => onChangeContext('tempMethod', e.target.value as ObservationContext['tempMethod'])}
          >
            <option value="oral">Oral</option>
            <option value="tympanic">Timpánica</option>
            <option value="core_sensor">Sensor central</option>
            <option value="unknown">No especificado</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={context.confirmedRepeated}
            onChange={(e) => onChangeContext('confirmedRepeated', e.target.checked)}
          />
          Lectura repetida para confirmar
        </label>
      </div>

      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink-muted)', marginBottom: 6 }}>
          Síntomas
        </p>
        <div className="chip-row">
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

      {userState ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn-tactile"
            style={{ background: 'var(--periwinkle-dark)', color: '#FFF' }}
            disabled={saving || canSaveCount === 0 || isSimulationOrReplay}
            onClick={onSaveCheckin}
          >
            <AresIcon name="clipboard" size={18} /> {saving ? 'Guardando...' : 'Guardar medición'}
          </button>
          {isSimulationOrReplay ? (
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
              Al editar un control, vuelves a tu medición personal con ese cambio.
            </span>
          ) : null}
        </div>
      ) : (
        <p>Cargando bitácora local...</p>
      )}

      {saveMessage ? (
        <p
          style={{
            marginTop: 10,
            fontSize: '0.78rem',
            fontWeight: 800,
            padding: '7px 10px',
            borderRadius: 10,
            border: '2px solid var(--ink)',
            background: saveMessage.ok ? 'var(--green-bg)' : 'var(--red-bg)',
          }}
        >
          {saveMessage.text}
        </p>
      ) : null}
    </div>
  );
}
