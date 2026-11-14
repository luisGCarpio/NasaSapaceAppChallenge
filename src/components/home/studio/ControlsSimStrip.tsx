'use client';

import type { ScenarioId } from '@/domain/health';

interface ControlsSimStripProps {
  onRunScenario: (id: ScenarioId) => void;
  onClearAllMeasured: () => void;
}

export function ControlsSimStrip({ onRunScenario, onClearAllMeasured }: ControlsSimStripProps) {
  return (
    <div className="card" style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
          Simulaciones rápidas (solo prueba visual — no guardan en historial):
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          <button type="button" className="btn-tactile active-green" onClick={() => onRunScenario('nominal')}>
            🟢 Día Perfecto
          </button>
          <button type="button" className="btn-tactile active-yellow" onClick={() => onRunScenario('warning')}>
            🟡 Fatiga y Azúcar
          </button>
          <button type="button" className="btn-tactile active-red" onClick={() => onRunScenario('critical')}>
            🔴 Alerta Roja
          </button>
          <button type="button" className="btn-tactile" onClick={onClearAllMeasured}>
            ↺ Limpiar parciales
          </button>
        </div>
      </div>
    </div>
  );
}
