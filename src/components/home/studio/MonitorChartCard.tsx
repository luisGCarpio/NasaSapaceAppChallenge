'use client';

import { useState } from 'react';
import type { ActiveNasaReplay } from '@/context/AresContext';
import type { HealthEvaluation, HealthStatus } from '@/domain/health';
import { colorForLevel, statusToLevel, systemPercent, type TabKey } from './studio-types';

export interface SeriesPoint {
  label: string;
  score: number | null;
  hr: number | null;
  glucose: number | null;
  status: HealthStatus;
}

interface MonitorChartCardProps {
  evaluation: HealthEvaluation;
  rawPoints: SeriesPoint[];
  totalObsCount: number;
  activeNasaReplay: ActiveNasaReplay | null;
  onNavigateTab: (tab: TabKey) => void;
}

function buildPolyPoints(values: Array<{ idx: number; val: number }>, total: number, minV: number, maxV: number): string {
  const span = Math.max(1, maxV - minV);
  return values
    .map(({ idx, val }) => {
      const x = 18 + (idx / Math.max(1, total - 1)) * 284;
      const clamped = Math.max(minV, Math.min(maxV, val));
      const y = 114 - ((clamped - minV) / span) * 92;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function MonitorChartCard({
  evaluation,
  rawPoints,
  totalObsCount,
  activeNasaReplay,
  onNavigateTab,
}: MonitorChartCardProps) {
  const [chartMode, setChartMode] = useState<'score' | 'vitals'>('score');

  const scorePts = rawPoints
    .map((p, idx) => (typeof p.score === 'number' ? { idx, val: p.score, status: p.status, label: p.label } : null))
    .filter((x): x is { idx: number; val: number; status: HealthStatus; label: string } => Boolean(x));

  const hrPts = rawPoints
    .map((p, idx) => (typeof p.hr === 'number' ? { idx, val: p.hr, label: p.label } : null))
    .filter((x): x is { idx: number; val: number; label: string } => Boolean(x));

  const glucPts = rawPoints
    .map((p, idx) => (typeof p.glucose === 'number' ? { idx, val: p.glucose, label: p.label } : null))
    .filter((x): x is { idx: number; val: number; label: string } => Boolean(x));

  return (
    <div className="card">
      <div className="group-head" style={{ marginBottom: 10 }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          📈 Monitor en Vivo
        </h2>
        <span className="val-pill">
          {activeNasaReplay ? `NASA ${activeNasaReplay.subjectId}` : `${totalObsCount} tomas reales`}
        </span>
      </div>

      <div className="chart-tabs">
        <button
          type="button"
          className={`chart-tab${chartMode === 'score' ? ' active' : ''}`}
          onClick={() => setChartMode('score')}
        >
          Equilibrio
        </button>
        <button
          type="button"
          className={`chart-tab${chartMode === 'vitals' ? ' active' : ''}`}
          onClick={() => setChartMode('vitals')}
        >
          Pulso / Azúcar
        </button>
      </div>

      <div className="chart-box">
        {chartMode === 'score' ? (
          scorePts.length >= 2 ? (
            <svg id="liveChart" width="100%" height="145" viewBox="0 0 320 140" role="img" aria-label="Serie real de equilibrio">
              <line x1="16" y1="22" x2="304" y2="22" stroke="#D8D2C5" strokeDasharray="4 4" />
              <line x1="16" y1="68" x2="304" y2="68" stroke="#D8D2C5" strokeDasharray="4 4" />
              <line x1="16" y1="114" x2="304" y2="114" stroke="#D8D2C5" strokeDasharray="4 4" />
              <polyline
                fill="none"
                stroke="var(--periwinkle)"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={buildPolyPoints(scorePts, rawPoints.length, 0, 100)}
              />
              {scorePts.map((pt) => {
                const x = 18 + (pt.idx / Math.max(1, rawPoints.length - 1)) * 284;
                const y = 114 - (Math.max(0, Math.min(100, pt.val)) / 100) * 92;
                return (
                  <circle
                    key={`${pt.idx}-${pt.label}`}
                    cx={x}
                    cy={y}
                    r="5"
                    fill={colorForLevel(statusToLevel(pt.status))}
                    stroke="#1C1917"
                    strokeWidth="2"
                  />
                );
              })}
              <text x="16" y="133" fontSize="10" fontWeight="700" fill="#635D56">
                {scorePts[0].label} ({scorePts[0].val})
              </text>
              <text x="304" y="133" textAnchor="end" fontSize="10" fontWeight="700" fill="#1C1917">
                {scorePts[scorePts.length - 1].label} ({scorePts[scorePts.length - 1].val})
              </text>
            </svg>
          ) : (
            <div style={{ textAlign: 'center', padding: '18px 10px' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 800, marginBottom: 6 }}>
                Sin serie histórica suficiente — {totalObsCount} observacion(es) reales guardadas
              </p>
              <p style={{ fontSize: '0.73rem', color: 'var(--ink-muted)', marginBottom: 10 }}>
                Sin curvas simuladas ni datos inventados: guarda al menos 2 tomas o carga un sujeto real NASA.
              </p>
              <button type="button" className="btn-tactile" onClick={() => onNavigateTab('controls')}>
                🎛️ Registrar toma real
              </button>
            </div>
          )
        ) : hrPts.length >= 2 || glucPts.length >= 2 ? (
          <svg id="liveChart" width="100%" height="145" viewBox="0 0 320 140" role="img" aria-label="Serie real pulso y glucosa">
            <line x1="16" y1="22" x2="304" y2="22" stroke="#D8D2C5" strokeDasharray="4 4" />
            <line x1="16" y1="114" x2="304" y2="114" stroke="#D8D2C5" strokeDasharray="4 4" />
            {hrPts.length >= 2 ? (
              <polyline fill="none" stroke="var(--tangerine)" strokeWidth="3" strokeLinecap="round" points={buildPolyPoints(hrPts, rawPoints.length, 40, 160)} />
            ) : null}
            {glucPts.length >= 2 ? (
              <polyline fill="none" stroke="var(--periwinkle)" strokeWidth="3" strokeLinecap="round" points={buildPolyPoints(glucPts, rawPoints.length, 55, 200)} />
            ) : null}
            <text x="16" y="133" fontSize="10" fontWeight="700" fill="var(--tangerine)">● FC ({hrPts.length} pts)</text>
            <text x="304" y="133" textAnchor="end" fontSize="10" fontWeight="700" fill="var(--periwinkle)">● Glucosa ({glucPts.length} pts)</text>
          </svg>
        ) : (
          <div style={{ textAlign: 'center', padding: '18px 10px' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 800 }}>
              Se requieren &gt;= 2 lecturas reales de FC o glucosa ({hrPts.length} FC · {glucPts.length} gluc)
            </p>
          </div>
        )}
      </div>

      <div className="mini-bars">
        {([
          ['mind', 'Mente'],
          ['heart', 'Corazón'],
          ['body', 'Defensas'],
        ] as const).map(([sysId, label]) => {
          const sysEval = evaluation.systems[sysId];
          const lvl = statusToLevel(sysEval.status);
          const pct = systemPercent(sysEval.status, evaluation.readinessScore);
          return (
            <div key={sysId} className="mini-bar-item">
              <span>{label}</span>
              <div className="mini-bar-track">
                <div className="mini-bar-fill" style={{ width: `${pct !== null ? pct : 10}%`, background: colorForLevel(lvl) }} />
              </div>
              <span className="mono">{pct !== null ? `${pct}%` : 'S/D'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
