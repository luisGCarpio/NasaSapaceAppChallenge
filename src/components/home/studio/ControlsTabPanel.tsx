'use client';

import type { ReactNode } from 'react';
import type { HealthEvaluation, ScenarioId, SystemId } from '@/domain/health';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import type { PublicUserState } from '@/server/storage/types';
import { ContextAndSaveCard } from './ContextAndSaveCard';
import { ControlsSimStrip } from './ControlsSimStrip';
import {
  colorForLevel,
  MOOD_DISPLAY,
  MOOD_LABELS_FULL,
  statusToLevel,
  type StudioDraft,
  type VitalToggleKey,
} from './studio-types';

type NumericKey = 'sleep_hours' | 'heart_rate' | 'bp_systolic' | 'bp_diastolic' | 'glucose' | 'temperature';

interface ControlsTabPanelProps {
  draft: StudioDraft;
  context: ObservationContext;
  evaluation: HealthEvaluation;
  highlightedSys: SystemId | null;
  userState: PublicUserState | null;
  saving: boolean;
  saveMessage: { ok: boolean; text: string } | null;
  isSimulationOrReplay: boolean;
  onUpdateNumeric: (field: NumericKey, value: number) => void;
  onUpdateMood: (idx: number) => void;
  onToggleMeasured: (key: VitalToggleKey) => void;
  onChangeContext: <K extends keyof ObservationContext>(key: K, val: ObservationContext[K]) => void;
  onRunScenario: (id: ScenarioId) => void;
  onClearAllMeasured: () => void;
  onSaveCheckin: () => void;
  onQuickCrewLogin: (username: 'elena' | 'marco', password: string) => Promise<void>;
  onCustomLogin: (identifier: string, password: string) => Promise<void>;
}

interface MeasureRowProps {
  toggleKey: VitalToggleKey;
  measured: boolean;
  label: string;
  pillId: string;
  pillValue: string;
  onToggle: (key: VitalToggleKey) => void;
  children: ReactNode;
}

function MeasureRow({ toggleKey, measured, label, pillId, pillValue, onToggle, children }: MeasureRowProps) {
  return (
    <div className={`control-row${measured ? '' : ' is-omitted'}`}>
      <div className="control-label">
        <span>{label}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            className={`measure-toggle${measured ? '' : ' omitted'}`}
            onClick={() => onToggle(toggleKey)}
          >
            {measured ? 'Medido ✓' : 'Omitir —'}
          </button>
          <span className="val-pill" id={pillId}>
            {measured ? pillValue : 'Sin dato'}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

export function ControlsTabPanel({
  draft,
  context,
  evaluation,
  highlightedSys,
  userState,
  saving,
  saveMessage,
  isSimulationOrReplay,
  onUpdateNumeric,
  onUpdateMood,
  onToggleMeasured,
  onChangeContext,
  onRunScenario,
  onClearAllMeasured,
  onSaveCheckin,
  onQuickCrewLogin,
  onCustomLogin,
}: ControlsTabPanelProps) {
  const mindLvl = statusToLevel(evaluation.systems.mind.status);
  const heartLvl = statusToLevel(evaluation.systems.heart.status);
  const bodyLvl = statusToLevel(evaluation.systems.body.status);

  return (
    <section className="controls-stack">
      <ControlsSimStrip onRunScenario={onRunScenario} onClearAllMeasured={onClearAllMeasured} />

      <div className={`system-group${highlightedSys === 'mind' ? ' highlight' : ''}`} id="group-mind">
        <div className="group-head">
          <div className="group-head-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B6BFF" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z" />
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z" />
            </svg>
            1. Mente y Descanso
          </div>
          <span className="dot-status" id="dot-mind" style={{ background: colorForLevel(mindLvl) }} />
        </div>

        <MeasureRow
          toggleKey="sleep_hours"
          measured={draft.measured.sleep_hours}
          label="Horas de sueño"
          pillId="val-sleep"
          pillValue={`${draft.sleep_hours.toFixed(1)} h`}
          onToggle={onToggleMeasured}
        >
          <input type="range" id="in-sleep" min={0} max={14} step={0.5} value={draft.sleep_hours} onChange={(e) => onUpdateNumeric('sleep_hours', parseFloat(e.target.value))} />
        </MeasureRow>

        <MeasureRow
          toggleKey="mood"
          measured={draft.measured.mood}
          label="Estado de ánimo (autorreporte)"
          pillId="val-mood"
          pillValue={MOOD_LABELS_FULL[draft.moodIndex]}
          onToggle={onToggleMeasured}
        >
          <div className="mood-grid" id="moodGrid">
            {MOOD_DISPLAY.map((label, idx) => (
              <button
                key={label}
                type="button"
                className={`mood-btn${draft.measured.mood && draft.moodIndex === idx ? ' selected' : ''}`}
                data-mood={idx}
                onClick={() => onUpdateMood(idx)}
              >
                <span style={{ fontSize: '0.95rem' }}>{['😫', '😰', '😪', '🙂', '😄'][idx]}</span>
                {label}
              </button>
            ))}
          </div>
        </MeasureRow>
      </div>

      <div className={`system-group${highlightedSys === 'heart' ? ' highlight' : ''}`} id="group-heart">
        <div className="group-head">
          <div className="group-head-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF3B4E" stroke="#1C1917" strokeWidth="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            2. Corazón y Circulación
          </div>
          <span className="dot-status" id="dot-heart" style={{ background: colorForLevel(heartLvl) }} />
        </div>

        <MeasureRow
          toggleKey="heart_rate"
          measured={draft.measured.heart_rate}
          label="Frecuencia cardíaca"
          pillId="val-bpm"
          pillValue={`${draft.heart_rate} BPM`}
          onToggle={onToggleMeasured}
        >
          <input type="range" id="in-bpm" min={35} max={185} step={1} value={draft.heart_rate} onChange={(e) => onUpdateNumeric('heart_rate', parseFloat(e.target.value))} />
        </MeasureRow>

        <MeasureRow
          toggleKey="bp"
          measured={draft.measured.bp}
          label="Presión arterial"
          pillId="val-bp"
          pillValue={`${draft.bp_systolic}/${draft.bp_diastolic} mmHg`}
          onToggle={onToggleMeasured}
        >
          <div className="dual-bp">
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--ink-muted)' }}>Alta (Sist.)</span>
              <input type="range" id="in-sys" min={65} max={200} step={1} value={draft.bp_systolic} onChange={(e) => onUpdateNumeric('bp_systolic', parseFloat(e.target.value))} />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--ink-muted)' }}>Baja (Diast.)</span>
              <input type="range" id="in-dia" min={35} max={125} step={1} value={draft.bp_diastolic} onChange={(e) => onUpdateNumeric('bp_diastolic', parseFloat(e.target.value))} />
            </div>
          </div>
        </MeasureRow>
      </div>

      <div className={`system-group${highlightedSys === 'body' ? ' highlight' : ''}`} id="group-body">
        <div className="group-head">
          <div className="group-head-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFB800" stroke="#1C1917" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            3. Energía y Defensas
          </div>
          <span className="dot-status" id="dot-body" style={{ background: colorForLevel(bodyLvl) }} />
        </div>

        <MeasureRow
          toggleKey="glucose"
          measured={draft.measured.glucose}
          label="Glucosa en sangre"
          pillId="val-glucose"
          pillValue={`${draft.glucose} mg/dL`}
          onToggle={onToggleMeasured}
        >
          <input type="range" id="in-glucose" min={35} max={250} step={1} value={draft.glucose} onChange={(e) => onUpdateNumeric('glucose', parseFloat(e.target.value))} />
        </MeasureRow>

        <MeasureRow
          toggleKey="temperature"
          measured={draft.measured.temperature}
          label="Temperatura corporal"
          pillId="val-temp"
          pillValue={`${draft.temperature.toFixed(1)} °C`}
          onToggle={onToggleMeasured}
        >
          <input type="range" id="in-temp" min={34.5} max={40.0} step={0.1} value={draft.temperature} onChange={(e) => onUpdateNumeric('temperature', parseFloat(e.target.value))} />
        </MeasureRow>
      </div>

      <ContextAndSaveCard
        context={context}
        userState={userState}
        saving={saving}
        saveMessage={saveMessage}
        canSaveCount={evaluation.coverage.presentCount}
        isSimulationOrReplay={isSimulationOrReplay}
        onChangeContext={onChangeContext}
        onSaveCheckin={onSaveCheckin}
        onQuickCrewLogin={onQuickCrewLogin}
        onCustomLogin={onCustomLogin}
      />
    </section>
  );
}
