'use client';

import type { ScenarioId } from '@/domain/health';
import { AresIcon } from '@/components/ui/Icons';

interface ControlsSimStripProps {
  onRunScenario: (id: ScenarioId) => void;
  onClearAllMeasured: () => void;
  onResetDemo?: () => void;
}

export function ControlsSimStrip({ onRunScenario, onClearAllMeasured, onResetDemo }: ControlsSimStripProps) {
  return (
    <div className="sim-strip">
      <p className="sim-strip-note">
        Carga un escenario de ejemplo sin modificar tus datos guardados.
      </p>
      <div className="sim-strip-actions">
        <button type="button" className="btn-tactile active-green" onClick={() => onRunScenario('nominal')}>
          Día normal
        </button>
        <button type="button" className="btn-tactile active-yellow" onClick={() => onRunScenario('warning')}>
          Fatiga
        </button>
        <button type="button" className="btn-tactile active-red" onClick={() => onRunScenario('critical')}>
          Alerta
        </button>
        {onResetDemo ? (
          <button type="button" className="btn-tactile" onClick={onResetDemo}>
            Restaurar demo
          </button>
        ) : null}
        <button type="button" className="btn-tactile" onClick={onClearAllMeasured}>
          <AresIcon name="sync" size={16} /> Limpiar
        </button>
      </div>
    </div>
  );
}
