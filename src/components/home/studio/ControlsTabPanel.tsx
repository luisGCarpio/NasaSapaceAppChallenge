'use client';

import type { ReactNode } from 'react';
import { AresIcon } from '@/components/ui/Icons';
import styles from './ControlsMissions.module.css';
import { VITAL_SPECS, type HealthEvaluation, type ScenarioId, type SystemId } from '@/domain/health';
import type { ObservationContext } from '@/domain/nasa/nasa-types';
import type { PublicUserState } from '@/server/storage/types';
import { ContextAndSaveCard } from './ContextAndSaveCard';
import { ControlsSimStrip } from './ControlsSimStrip';
import {
  MOOD_DISPLAY,
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
  onResetDemo?: () => void;
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
        <h2 className="group-head-left">
          {icon}
          <span>{title}</span>
        </h2>
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
  htmlFor?: string;
  labelId?: string;
  pillId?: string;
  pillValue?: string;
  children: ReactNode;
}

function MeasureRow({ measured, label, htmlFor, labelId, pillId, pillValue, children }: MeasureRowProps) {
  return (
    <div className={`control-row${measured ? '' : ' is-omitted'}`}>
      <div className="control-label">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span id={labelId}>{label}</span>}
        {pillId ? (
          <span className={measured ? 'val-pill' : 'val-pill is-empty'} id={pillId}>
            {measured ? pillValue : '—'}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

interface VitalRangeControlProps {
  id: string;
  field: NumericKey;
  value: number;
  min: number;
  max: number;
  step: number;
  valueText: string;
  describedBy: string;
  onUpdate: (field: NumericKey, value: number) => void;
}

function VitalRangeControl({
  id,
  field,
  value,
  min,
  max,
  step,
  valueText,
  describedBy,
  onUpdate,
}: VitalRangeControlProps) {
  return (
    <input
      type="range"
      id={id}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-describedby={describedBy}
      aria-valuetext={valueText}
      style={{ touchAction: 'pan-y' }}
      onChange={(e) => onUpdate(field, parseFloat(e.target.value))}
    />
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
  onResetDemo,
  onClearAllMeasured,
  onSaveCheckin,
}: ControlsTabPanelProps) {
  const mindMeasured = MIND_KEYS.some((key) => draft.measured[key]);
  const heartMeasured = HEART_KEYS.some((key) => draft.measured[key]);
  const bodyMeasured = BODY_KEYS.some((key) => draft.measured[key]);

  return (
    <section
      className={`controls-stack ${styles.controls}`}
      onPointerDownCapture={highlightedSys !== null ? onInteract : undefined}
      onKeyDownCapture={highlightedSys !== null ? onInteract : undefined}
    >
      {isSimulationOrReplay ? (
        <div className="sim-active-banner" role="status">
          <span>Modo simulación activo — datos de prueba, no tu registro real</span>
          <button type="button" className="btn-tactile" onClick={onClearAllMeasured}>
            Volver a mis datos
          </button>
        </div>
      ) : null}

      <SystemCard
        id="group-mind"
        title="Mente y descanso"
        highlighted={highlightedSys === 'mind'}
        measured={mindMeasured}
        onToggleMeasured={() => onToggleSystemMeasured(MIND_KEYS)}
        icon={
          <span className="system-icon-badge is-mind" aria-hidden="true">
            <AresIcon name="brain" size={18} />
          </span>
        }
      >
        <MeasureRow
          measured={draft.measured.sleep_hours}
          label="Horas de sueño"
          htmlFor="in-sleep"
          pillId="val-sleep"
          pillValue={`${draft.sleep_hours.toFixed(1)} h`}
        >
          <VitalRangeControl
            id="in-sleep"
            field="sleep_hours"
            value={draft.sleep_hours}
            min={VITAL_SPECS.sleep_hours.min}
            max={VITAL_SPECS.sleep_hours.max}
            step={VITAL_SPECS.sleep_hours.step}
            valueText={`${draft.sleep_hours.toFixed(1)} h`}
            describedBy="val-sleep"
            onUpdate={onUpdateNumeric}
          />
        </MeasureRow>

        <MeasureRow
          measured={draft.measured.mood}
          label="Estado de ánimo"
          labelId="label-mood"
        >
          <div className="mood-grid" id="moodGrid" role="group" aria-labelledby="label-mood">
            {MOOD_DISPLAY.map((label, idx) => (
              <button
                key={label}
                type="button"
                className={`mood-btn${draft.measured.mood && draft.moodIndex === idx ? ' selected' : ''}`}
                data-mood={idx}
                aria-pressed={draft.measured.mood && draft.moodIndex === idx}
                onClick={() => onUpdateMood(idx)}
              >
                <svg
                  className={styles.moodIcon}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.15}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" vectorEffect="non-scaling-stroke" />
                  <path d="M9 9.5h.01M15 9.5h.01" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
                  <path
                    d={idx < 2 ? 'M8.5 16.5c1.2-2 5.8-2 7 0' : idx === 2 ? 'M8.5 15.5h7' : 'M8.5 14c1.2 2.4 5.8 2.4 7 0'}
                    vectorEffect="non-scaling-stroke"
                  />
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
          <span className="system-icon-badge is-heart" aria-hidden="true">
            <AresIcon name="heart" size={18} />
          </span>
        }
      >
        <MeasureRow
          measured={draft.measured.heart_rate}
          label="Frecuencia cardíaca"
          htmlFor="in-bpm"
          pillId="val-bpm"
          pillValue={`${draft.heart_rate} lpm`}
        >
          <VitalRangeControl
            id="in-bpm"
            field="heart_rate"
            value={draft.heart_rate}
            min={VITAL_SPECS.heart_rate.min}
            max={VITAL_SPECS.heart_rate.max}
            step={VITAL_SPECS.heart_rate.step}
            valueText={`${draft.heart_rate} lpm`}
            describedBy="val-bpm"
            onUpdate={onUpdateNumeric}
          />
        </MeasureRow>

        <MeasureRow
          measured={draft.measured.bp}
          label="Presión arterial"
          pillId="val-bp"
          pillValue={`${draft.bp_systolic}/${draft.bp_diastolic} mmHg`}
        >
          <fieldset className="dual-bp" style={{ border: 0, minWidth: 0 }}>
            <legend className="sr-only">Presión arterial</legend>
            <div>
              <label
                htmlFor="in-sys"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink-muted)', marginBottom: 4 }}
              >
                Alta (Sist.)
              </label>
              <VitalRangeControl
                id="in-sys"
                field="bp_systolic"
                value={draft.bp_systolic}
                min={VITAL_SPECS.bp_systolic.min}
                max={VITAL_SPECS.bp_systolic.max}
                step={VITAL_SPECS.bp_systolic.step}
                valueText={`${draft.bp_systolic} mmHg`}
                describedBy="val-bp"
                onUpdate={onUpdateNumeric}
              />
            </div>
            <div>
              <label
                htmlFor="in-dia"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink-muted)', marginBottom: 4 }}
              >
                Baja (Diast.)
              </label>
              <VitalRangeControl
                id="in-dia"
                field="bp_diastolic"
                value={draft.bp_diastolic}
                min={VITAL_SPECS.bp_diastolic.min}
                max={VITAL_SPECS.bp_diastolic.max}
                step={VITAL_SPECS.bp_diastolic.step}
                valueText={`${draft.bp_diastolic} mmHg`}
                describedBy="val-bp"
                onUpdate={onUpdateNumeric}
              />
            </div>
          </fieldset>
          {draft.measured.bp && draft.bp_systolic - draft.bp_diastolic < 10 ? (
            <p
              role="status"
              style={{
                marginTop: 6,
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--tangerine-dark)',
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
          <span className="system-icon-badge is-body" aria-hidden="true">
            <AresIcon name="bolt" size={18} />
          </span>
        }
      >
        <MeasureRow
          measured={draft.measured.glucose}
          label="Glucosa en sangre"
          htmlFor="in-glucose"
          pillId="val-glucose"
          pillValue={`${draft.glucose} mg/dL`}
        >
          <VitalRangeControl
            id="in-glucose"
            field="glucose"
            value={draft.glucose}
            min={VITAL_SPECS.glucose.min}
            max={VITAL_SPECS.glucose.max}
            step={VITAL_SPECS.glucose.step}
            valueText={`${draft.glucose} mg/dL`}
            describedBy="val-glucose"
            onUpdate={onUpdateNumeric}
          />
        </MeasureRow>

        <MeasureRow
          measured={draft.measured.temperature}
          label="Temperatura corporal"
          htmlFor="in-temp"
          pillId="val-temp"
          pillValue={`${draft.temperature.toFixed(1)} °C`}
        >
          <VitalRangeControl
            id="in-temp"
            field="temperature"
            value={draft.temperature}
            min={VITAL_SPECS.temperature.min}
            max={VITAL_SPECS.temperature.max}
            step={VITAL_SPECS.temperature.step}
            valueText={`${draft.temperature.toFixed(1)} °C`}
            describedBy="val-temp"
            onUpdate={onUpdateNumeric}
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
        onClearAllMeasured={onClearAllMeasured}
      />

      <details className="sim-disclosure">
        <summary>
          <span>Simulaciones de prueba (opcional)</span>
          <span className="details-cue" aria-hidden="true">Abrir</span>
        </summary>
        <ControlsSimStrip
          onRunScenario={onRunScenario}
          onClearAllMeasured={onClearAllMeasured}
          onResetDemo={onResetDemo}
        />
      </details>
    </section>
  );
}
