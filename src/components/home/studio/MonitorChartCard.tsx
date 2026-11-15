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

function pointCoords(idx: number, val: number, total: number, minV: number, maxV: number): { x: number; y: number } {
  const span = Math.max(1, maxV - minV);
  const x = 30 + (idx / Math.max(1, total - 1)) * 272;
  const clamped = Math.max(minV, Math.min(maxV, val));
  const y = 110 - ((clamped - minV) / span) * 90;
  return { x, y };
}

function buildPolyPoints(values: Array<{ idx: number; val: number }>, total: number, minV: number, maxV: number): string {
  return values
    .map(({ idx, val }) => {
      const { x, y } = pointCoords(idx, val, total, minV, maxV);
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
          Evolución
        </h2>
        <span className="val-pill">
          {activeNasaReplay ? `NASA ${activeNasaReplay.subjectId}` : `${totalObsCount} tomas reales`}
        </span>
      </div>

      <div className="chart-tabs">
        <button
          type="button"
          className={`chart-tab${chartMode === 'score' ? ' active' : ''}`}
          aria-pressed={chartMode === 'score'}
          onClick={() => setChartMode('score')}
        >
          Equilibrio
        </button>
        <button
          type="button"
          className={`chart-tab${chartMode === 'vitals' ? ' active' : ''}`}
          aria-pressed={chartMode === 'vitals'}
          onClick={() => setChartMode('vitals')}
        >
          Pulso / Azúcar
        </button>
      </div>

      <div className="chart-box">
        {chartMode === 'score' ? (
          scorePts.length >= 2 ? (
            <>
              <svg id="liveChart" width="100%" height="132" viewBox="0 0 320 124" role="img" aria-label="Serie real de equilibrio">
                <text x="6" y="24" fontSize="9.5" fontWeight="700" fill="#635D56">100</text>
                <text x="10" y="69" fontSize="9.5" fontWeight="700" fill="#635D56">50</text>
                <text x="14" y="113" fontSize="9.5" fontWeight="700" fill="#635D56">0</text>
                <line x1="28" y1="20" x2="304" y2="20" stroke="#D8D2C5" strokeDasharray="4 4" />
                <line x1="28" y1="65" x2="304" y2="65" stroke="#D8D2C5" strokeDasharray="4 4" />
                <line x1="28" y1="110" x2="304" y2="110" stroke="#D8D2C5" strokeDasharray="4 4" />
                <polyline
                  fill="none"
                  stroke="var(--periwinkle-dark)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={buildPolyPoints(scorePts, rawPoints.length, 0, 100)}
                />
                {scorePts.map((pt) => {
                  const { x, y } = pointCoords(pt.idx, pt.val, rawPoints.length, 0, 100);
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
              </svg>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                <span style={{ color: 'var(--ink-muted)' }}>
                  {scorePts[0].label} ({scorePts[0].val})
                </span>
                <span style={{ color: 'var(--ink)' }}>
                  {scorePts[scorePts.length - 1].label} ({scorePts[scorePts.length - 1].val})
                </span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '18px 10px' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 800, marginBottom: 6 }}>
                Aún no hay suficientes mediciones
              </p>
              <p style={{ fontSize: '0.73rem', color: 'var(--ink-muted)', marginBottom: 10 }}>
                {activeNasaReplay ? 'Este caso necesita dos mediciones con índice para mostrar la evolución.' : 'Guarda dos mediciones para ver tu evolución.'}
              </p>
              {!activeNasaReplay && <button type="button" className="btn-tactile" onClick={() => onNavigateTab('controls')}>
                Registrar medición
              </button>}
            </div>
          )
        ) : hrPts.length >= 2 || glucPts.length >= 2 ? (
          <>
            <svg id="liveChart" width="100%" height="132" viewBox="0 0 320 124" role="img" aria-label="Serie real pulso y glucosa">
              <text x="6" y="24" fontSize="9" fontWeight="700" fill="#635D56">Máx</text>
              <text x="6" y="113" fontSize="9" fontWeight="700" fill="#635D56">Mín</text>
              <line x1="28" y1="20" x2="304" y2="20" stroke="#D8D2C5" strokeDasharray="4 4" />
              <line x1="28" y1="65" x2="304" y2="65" stroke="#D8D2C5" strokeDasharray="4 4" />
              <line x1="28" y1="110" x2="304" y2="110" stroke="#D8D2C5" strokeDasharray="4 4" />
              {hrPts.length >= 2 ? (
                <polyline
                  fill="none"
                  stroke="var(--tangerine-dark)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={buildPolyPoints(hrPts, rawPoints.length, 40, 160)}
                />
              ) : null}
              {hrPts.map((pt) => {
                const { x, y } = pointCoords(pt.idx, pt.val, rawPoints.length, 40, 160);
                return (
                  <circle
                    key={`hr-${pt.idx}-${pt.label}`}
                    cx={x}
                    cy={y}
                    r="4.5"
                    fill="var(--tangerine)"
                    stroke="#1C1917"
                    strokeWidth="1.8"
                  />
                );
              })}
              {glucPts.length >= 2 ? (
                <polyline
                  fill="none"
                  stroke="var(--periwinkle-dark)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={buildPolyPoints(glucPts, rawPoints.length, 55, 200)}
                />
              ) : null}
              {glucPts.map((pt) => {
                const { x, y } = pointCoords(pt.idx, pt.val, rawPoints.length, 55, 200);
                return (
                  <circle
                    key={`gluc-${pt.idx}-${pt.label}`}
                    cx={x}
                    cy={y}
                    r="4.5"
                    fill="var(--periwinkle)"
                    stroke="#1C1917"
                    strokeWidth="1.8"
                  />
                );
              })}
            </svg>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
                fontSize: '0.72rem',
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              <span style={{ color: hrPts.length > 0 ? 'var(--tangerine-dark)' : 'var(--ink-muted)' }}>
                {hrPts.length > 0 ? `● Pulso 40–160 bpm (${hrPts.length} pts)` : 'Pulso: Sin datos'}
              </span>
              <span style={{ color: glucPts.length > 0 ? 'var(--periwinkle-dark)' : 'var(--ink-muted)' }}>
                {glucPts.length > 0 ? `● Glucosa 55–200 mg/dL (${glucPts.length} pts)` : 'Glucosa: Sin datos'}
              </span>
            </div>
            {rawPoints.length >= 2 ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--ink-muted)',
                  marginTop: 4,
                }}
              >
                <span>{rawPoints[0].label}</span>
                <span>{rawPoints[rawPoints.length - 1].label}</span>
              </div>
            ) : null}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '18px 10px' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 800 }}>
              Necesitas dos mediciones de pulso o glucosa.
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
