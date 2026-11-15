'use client';

import type { ScenarioId } from '@/domain/health';
import { AresIcon } from '@/components/ui/Icons';

interface ControlsSimStripProps {
  onRunScenario: (id: ScenarioId) => void;
  onClearAllMeasured: () => void;
}

export function ControlsSimStrip({ onRunScenario, onClearAllMeasured }: ControlsSimStripProps) {
  return (
    <div className="card" style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
          Simulaciones
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          <button type="button" className="btn-tactile active-green" onClick={() => onRunScenario('nominal')}>
            Día normal
          </button>
          <button type="button" className="btn-tactile active-yellow" onClick={() => onRunScenario('warning')}>
            Fatiga
          </button>
          <button type="button" className="btn-tactile active-red" onClick={() => onRunScenario('critical')}>
            Alerta
          </button>
          <button type="button" className="btn-tactile" onClick={onClearAllMeasured}>
            <AresIcon name="sync" size={16} /> Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
