'use client';

import type { ReactNode } from 'react';
import styles from './ControlsMissions.module.css';
import { VITAL_SPECS, type HealthEvaluation, type ScenarioId, type SystemId } from '@/domain/health';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import type { PublicUserState } from '@/server/storage/types';
import { ContextAndSaveCard } from './ContextAndSaveCard';
import { ControlsSimStrip } from './ControlsSimStrip';
import {
  MOOD_DISPLAY,
  MOOD_LABELS_FULL,
  type StudioDraft,
  type VitalToggleKey,
} from './studio-types';

type NumericKey = 'sleep_hours' | 'heart_rate' | 'bp_systolic' | 'bp_diastolic' | 'glucose' | 'temperature';

const MIND_KEYS: readonly VitalToggleKey[] = ['sleep_hours', 'mood'];
const HEART_KEYS: readonly VitalToggleKey[] = ['heart_rate', 'bp'];
const BODY_KEYS: readonly VitalToggleKey[] = ['glucose', 'temperature'];

interface ControlsTabPanelProps {
  draft: StudioDraft;
  context: ObservationContext;
  evaluation: HealthEvaluation;
  highlightedSys: SystemId | null;
  onInteract: () => void;
  userState: PublicUserState | null;
  saving: boolean;
  saveMessage: { ok: boolean; text: string } | null;
  isSimulationOrReplay: boolean;
  onUpdateNumeric: (field: NumericKey, value: number) => void;
  onUpdateMood: (idx: number) => void;
  onToggleSystemMeasured: (keys: readonly VitalToggleKey[]) => void;
  onChangeContext: <K extends keyof ObservationContext>(key: K, val: ObservationContext[K]) => void;
  onRunScenario: (id: ScenarioId) => void;
  onClearAllMeasured: () => void;
  onSaveCheckin: () => void;
}

interface SystemCardProps {
  id: string;
  title: string;
  icon: ReactNode;
  highlighted: boolean;
  measured: boolean;
  onToggleMeasured: () => void;
  children: ReactNode;
}

function SystemCard({ id, title, icon, highlighted, measured, onToggleMeasured, children }: SystemCardProps) {
  return (
    <div className={`system-group${highlighted ? ' highlight' : ''}`} id={id}>
      <div className="group-head">
        <div className="group-head-left">
          {icon}
          {title}
        </div>
        <button
          type="button"
          className={`measure-toggle${measured ? '' : ' omitted'}`}
          aria-pressed={measured}
          aria-label={`${measured ? 'Quitar medición de' : 'Marcar como medido'} ${title}`}
          onClick={onToggleMeasured}
        >
          {measured ? 'Medido' : 'Sin medir'}
        </button>
      </div>
      {children}
    </div>
  );
}

interface MeasureRowProps {
  measured: boolean;
  label: string;
  pillId: string;
  pillValue: string;
  children: ReactNode;
}

function MeasureRow({ measured, label, pillId, pillValue, children }: MeasureRowProps) {
  return (
    <div className={`control-row${measured ? '' : ' is-omitted'}`}>
      <div className="control-label">
        <span>{label}</span>
        <span className="val-pill" id={pillId}>
          {measured ? pillValue : 'Sin dato'}
        </span>
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
  onInteract,
  userState,
  saving,
  saveMessage,
  isSimulationOrReplay,
  onUpdateNumeric,
  onUpdateMood,
  onToggleSystemMeasured,
  onChangeContext,
  onRunScenario,
  onClearAllMeasured,
  onSaveCheckin,
}: ControlsTabPanelProps) {
  const mindMeasured = MIND_KEYS.some((key) => draft.measured[key]);
  const heartMeasured = HEART_KEYS.some((key) => draft.measured[key]);
  const bodyMeasured = BODY_KEYS.some((key) => draft.measured[key]);

  return (
    <section className={`controls-stack ${styles.controls}`} onPointerDownCapture={onInteract} onKeyDownCapture={onInteract}>
      <ControlsSimStrip onRunScenario={onRunScenario} onClearAllMeasured={onClearAllMeasured} />

      <SystemCard
        id="group-mind"
        title="Mente y descanso"
        highlighted={highlightedSys === 'mind'}
        measured={mindMeasured}
        onToggleMeasured={() => onToggleSystemMeasured(MIND_KEYS)}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B6BFF" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z" />
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z" />
          </svg>
        }
      >
        <MeasureRow
          measured={draft.measured.sleep_hours}
          label="Horas de sueño"
          pillId="val-sleep"
          pillValue={`${draft.sleep_hours.toFixed(1)} h`}
        >
          <input
            type="range"
            id="in-sleep"
            aria-label="Horas de sueño"
            min={VITAL_SPECS.sleep_hours.min}
            max={VITAL_SPECS.sleep_hours.max}
            step={VITAL_SPECS.sleep_hours.step}
            value={draft.sleep_hours}
            onChange={(e) => onUpdateNumeric('sleep_hours', parseFloat(e.target.value))}
          />
        </MeasureRow>

        <MeasureRow
          measured={draft.measured.mood}
          label="Estado de ánimo"
          pillId="val-mood"
          pillValue={MOOD_LABELS_FULL[draft.moodIndex]}
        >
          <div className="mood-grid" id="moodGrid">
            {MOOD_DISPLAY.map((label, idx) => (
              <button
                key={label}
                type="button"
                className={`mood-btn${draft.measured.mood && draft.moodIndex === idx ? ' selected' : ''}`}
                data-mood={idx}
                aria-pressed={draft.measured.mood && draft.moodIndex === idx}
                onClick={() => onUpdateMood(idx)}
              >
                <svg className={styles.moodIcon} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 9h.01M16 9h.01" strokeWidth="3" />
                  <path d={idx < 2 ? 'M8 17c1.4-2.4 6.6-2.4 8 0' : idx === 2 ? 'M8 16h8' : 'M8 14c1.4 2.8 6.6 2.8 8 0'} />
                </svg>
                {label}
              </button>
            ))}
          </div>
        </MeasureRow>
      </SystemCard>

      <SystemCard
        id="group-heart"
        title="Corazón y circulación"
        highlighted={highlightedSys === 'heart'}
        measured={heartMeasured}
        onToggleMeasured={() => onToggleSystemMeasured(HEART_KEYS)}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF3B4E" stroke="#1C1917" strokeWidth="2">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        }
      >
        <MeasureRow
          measured={draft.measured.heart_rate}
          label="Frecuencia cardíaca"
          pillId="val-bpm"
          pillValue={`${draft.heart_rate} BPM`}
        >
          <input
            type="range"
            id="in-bpm"
            aria-label="Frecuencia cardíaca"
            min={VITAL_SPECS.heart_rate.min}
            max={VITAL_SPECS.heart_rate.max}
            step={VITAL_SPECS.heart_rate.step}
            value={draft.heart_rate}
            onChange={(e) => onUpdateNumeric('heart_rate', parseFloat(e.target.value))}
          />
        </MeasureRow>

        <MeasureRow
          measured={draft.measured.bp}
          label="Presión arterial"
          pillId="val-bp"
          pillValue={`${draft.bp_systolic}/${draft.bp_diastolic} mmHg`}
        >
          <div className="dual-bp">
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink-muted)' }}>Alta (Sist.)</span>
              <input
                type="range"
                id="in-sys"
                aria-label="Presión sistólica"
                min={VITAL_SPECS.bp_systolic.min}
                max={VITAL_SPECS.bp_systolic.max}
                step={VITAL_SPECS.bp_systolic.step}
                value={draft.bp_systolic}
                onChange={(e) => onUpdateNumeric('bp_systolic', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink-muted)' }}>Baja (Diast.)</span>
              <input
                type="range"
                id="in-dia"
                aria-label="Presión diastólica"
                min={VITAL_SPECS.bp_diastolic.min}
                max={VITAL_SPECS.bp_diastolic.max}
                step={VITAL_SPECS.bp_diastolic.step}
                value={draft.bp_diastolic}
                onChange={(e) => onUpdateNumeric('bp_diastolic', parseFloat(e.target.value))}
              />
            </div>
          </div>
          {draft.measured.bp && draft.bp_systolic - draft.bp_diastolic < 10 ? (
            <p
              role="status"
              style={{
                marginTop: 6,
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#991B1B',
              }}
            >
              Diferencial estrecho ({draft.bp_systolic - draft.bp_diastolic} mmHg): la presión sistólica debe superar a la diastólica por al menos 10 mmHg.
            </p>
          ) : null}
        </MeasureRow>
      </SystemCard>

      <SystemCard
        id="group-body"
        title="Energía y defensas"
        highlighted={highlightedSys === 'body'}
        measured={bodyMeasured}
        onToggleMeasured={() => onToggleSystemMeasured(BODY_KEYS)}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFB800" stroke="#1C1917" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        }
      >
        <MeasureRow
          measured={draft.measured.glucose}
          label="Glucosa en sangre"
          pillId="val-glucose"
          pillValue={`${draft.glucose} mg/dL`}
        >
          <input
            type="range"
            id="in-glucose"
            aria-label="Glucosa en sangre"
            min={VITAL_SPECS.glucose.min}
            max={VITAL_SPECS.glucose.max}
            step={VITAL_SPECS.glucose.step}
            value={draft.glucose}
            onChange={(e) => onUpdateNumeric('glucose', parseFloat(e.target.value))}
          />
        </MeasureRow>

        <MeasureRow
          measured={draft.measured.temperature}
          label="Temperatura corporal"
          pillId="val-temp"
          pillValue={`${draft.temperature.toFixed(1)} °C`}
        >
          <input
            type="range"
            id="in-temp"
            aria-label="Temperatura corporal"
            min={VITAL_SPECS.temperature.min}
            max={VITAL_SPECS.temperature.max}
            step={VITAL_SPECS.temperature.step}
            value={draft.temperature}
            onChange={(e) => onUpdateNumeric('temperature', parseFloat(e.target.value))}
          />
        </MeasureRow>
      </SystemCard>

      <ContextAndSaveCard
        context={context}
        userState={userState}
        saving={saving}
        saveMessage={saveMessage}
        canSaveCount={evaluation.coverage.presentCount}
        isSimulationOrReplay={isSimulationOrReplay}
        onChangeContext={onChangeContext}
        onSaveCheckin={onSaveCheckin}
      />
    </section>
  );
}
