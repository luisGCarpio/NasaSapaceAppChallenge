'use client';

import { useState } from 'react';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import type { PublicUserState } from '@/server/storage/types';

const SYMPTOMS = ['Mareo', 'Palpitaciones', 'Cefalea', 'Fatiga'] as const;

interface ContextAndSaveCardProps {
  context: ObservationContext;
  userState: PublicUserState | null;
  saving: boolean;
  saveMessage: { ok: boolean; text: string } | null;
  canSaveCount: number;
  isSimulationOrReplay: boolean;
  onChangeContext: <K extends keyof ObservationContext>(key: K, val: ObservationContext[K]) => void;
  onSaveCheckin: () => void;
  onQuickCrewLogin: (username: 'elena' | 'marco', password: string) => Promise<void>;
  onCustomLogin: (identifier: string, password: string) => Promise<void>;
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
  onQuickCrewLogin,
  onCustomLogin,
}: ContextAndSaveCardProps) {
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [idInput, setIdInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const toggleSymptom = (sym: string) => {
    const next = context.symptoms.includes(sym)
      ? context.symptoms.filter((s) => s !== sym)
      : [...context.symptoms, sym];
    onChangeContext('symptoms', next);
  };

  async function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    try {
      await onCustomLogin(idInput, passInput);
      setShowAuthForm(false);
    } finally {
      setAuthBusy(false);
    }
  }

  return (
    <div className="system-group" id="group-context">
      <div className="group-head">
        <div className="group-head-left">
          <span>🧭 4. Contexto Clínico y Guardado Real</span>
        </div>
        <span className="val-pill">{canSaveCount}/7 medidos</span>
      </div>

      <div className="context-grid">
        <label style={{ fontSize: '0.73rem', fontWeight: 700 }}>
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

        <label style={{ fontSize: '0.73rem', fontWeight: 700 }}>
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

        <label style={{ fontSize: '0.73rem', fontWeight: 700 }}>
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

        <label style={{ fontSize: '0.73rem', fontWeight: 700 }}>
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
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '0.76rem', fontWeight: 800, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={context.confirmedRepeated}
            onChange={(e) => onChangeContext('confirmedRepeated', e.target.checked)}
          />
          Segunda lectura confirmatoria realizada (5–15 min tras reposo)
        </label>
      </div>

      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-muted)', marginBottom: 6 }}>
          Síntomas presentes:
        </p>
        <div className="chip-row">
          {SYMPTOMS.map((sym) => (
            <button
              key={sym}
              type="button"
              className={`chip-toggle${context.symptoms.includes(sym) ? ' active' : ''}`}
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
            style={{ background: 'var(--periwinkle)', color: '#FFF' }}
            disabled={saving || canSaveCount === 0 || isSimulationOrReplay}
            onClick={onSaveCheckin}
          >
            {saving ? 'Guardando...' : '💾 Guardar toma real en Bitácora'}
          </button>
          {isSimulationOrReplay ? (
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-muted)' }}>
              En modo simulación/replay; ajusta un control para guardar una toma real.
            </span>
          ) : null}
        </div>
      ) : (
        <div style={{ background: 'var(--surface-alt)', border: '2px solid var(--ink)', borderRadius: 12, padding: 10 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: 8 }}>
            Inicia sesión para guardar esta toma en la bitácora y sumar XP real:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="btn-tactile" onClick={() => void onQuickCrewLogin('elena', '123')}>
              👩‍🚀 Entrar: Cmdr. Elena Vance
            </button>
            <button type="button" className="btn-tactile" onClick={() => void onQuickCrewLogin('marco', '123')}>
              👨‍🚀 Entrar: Esp. Marco Silva
            </button>
            <button type="button" className="btn-tactile" onClick={() => setShowAuthForm((v) => !v)}>
              🔐 Otro usuario
            </button>
          </div>
          {showAuthForm ? (
            <form onSubmit={(e) => void handleCustomSubmit(e)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <input
                className="context-select"
                style={{ width: 150 }}
                placeholder="Usuario (ej. elena)"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                required
              />
              <input
                className="context-select"
                style={{ width: 140 }}
                type="password"
                placeholder="Contraseña"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                required
              />
              <button type="submit" className="btn-tactile" disabled={authBusy}>
                {authBusy ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : null}
        </div>
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
