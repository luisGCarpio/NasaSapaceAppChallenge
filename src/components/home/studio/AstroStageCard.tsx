'use client';

import type { HealthEvaluation, PartialVitalValues, SystemId } from '@/domain/health';
import { bgForLevel, colorForLevel, statusToLevel } from './studio-types';

interface AstroStageCardProps {
  evaluation: HealthEvaluation;
  vitals: PartialVitalValues;
  onHighlightSystem: (sys: SystemId) => void;
}

function levelStatusLabel(lvl: -1 | 0 | 1 | 2): string {
  if (lvl === 0) return 'Óptimo';
  if (lvl === 1) return 'Precaución';
  if (lvl === 2) return 'Alerta roja';
  return 'Sin datos';
}

export function AstroStageCard({ evaluation, vitals, onHighlightSystem }: AstroStageCardProps) {
  const mindLvl = statusToLevel(evaluation.systems.mind.status);
  const heartLvl = statusToLevel(evaluation.systems.heart.status);
  const bodyLvl = statusToLevel(evaluation.systems.body.status);
  const overallLvl = statusToLevel(evaluation.overallStatus);

  const trafficLabel =
    overallLvl === 0
      ? 'TODO EN ÓRBITA'
      : overallLvl === 1
        ? 'CUIDADO PREVENTIVO'
        : overallLvl === 2
          ? 'ALERTA ROJA'
          : 'SIN DATOS';

  return (
    <div className="astro-stage">
      <div className="stage-header">
        <div className="traffic-badge" id="trafficBadge" style={{ background: bgForLevel(overallLvl) }}>
          <span
            id="trafficDot"
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: colorForLevel(overallLvl),
              border: '2px solid var(--ink)',
            }}
          />
          <span id="trafficLabel">{trafficLabel}</span>
        </div>
      </div>

      <div className="astro-svg-wrap">
        <svg
          className="astro-float"
          width="275"
          height="280"
          viewBox="0 -2 300 302"
          fill="none"
          role="group"
          aria-label="Mapa corporal interactivo del astronauta"
        >
          <rect x="88" y="128" width="124" height="86" rx="22" fill="#FF5A26" stroke="#1C1917" strokeWidth="4" />
          <rect x="110" y="212" width="32" height="58" rx="14" fill="#FFFDF8" stroke="#1C1917" strokeWidth="4" />
          <rect x="158" y="212" width="32" height="58" rx="14" fill="#FFFDF8" stroke="#1C1917" strokeWidth="4" />
          <rect x="106" y="252" width="38" height="20" rx="10" fill="#5B6BFF" stroke="#1C1917" strokeWidth="3.5" />
          <rect x="156" y="252" width="38" height="20" rx="10" fill="#5B6BFF" stroke="#1C1917" strokeWidth="3.5" />
          <rect x="56" y="138" width="42" height="24" rx="12" transform="rotate(-18 56 138)" fill="#FFFDF8" stroke="#1C1917" strokeWidth="4" />
          <rect x="202" y="126" width="42" height="24" rx="12" transform="rotate(18 202 126)" fill="#FFFDF8" stroke="#1C1917" strokeWidth="4" />
          <circle cx="52" cy="156" r="11" fill="#FFB800" stroke="#1C1917" strokeWidth="3.5" />
          <circle cx="248" cy="156" r="11" fill="#FFB800" stroke="#1C1917" strokeWidth="3.5" />
          <rect x="98" y="126" width="104" height="96" rx="28" fill="#FFFDF8" stroke="#1C1917" strokeWidth="4" />
          <rect x="100" y="196" width="100" height="16" rx="8" fill="#EFE9DC" stroke="#1C1917" strokeWidth="3" />
          <circle cx="150" cy="78" r="56" fill="#FFFDF8" stroke="#1C1917" strokeWidth="4" />
          <line x1="150" y1="22" x2="150" y2="12" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />
          <g className="hotspot" role="button" tabIndex={0} aria-label={`Mente: ${levelStatusLabel(mindLvl)} — abrir controles`} onClick={() => onHighlightSystem('mind')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onHighlightSystem('mind'); } }}>
            <circle cx="150" cy="12" r="24" fill="transparent" />
            <circle id="node-mind" cx="150" cy="12" r="9" fill={colorForLevel(mindLvl)} stroke="#1C1917" strokeWidth="3" />
          </g>
          <rect x="108" y="46" width="84" height="62" rx="28" fill="#2A2845" stroke="#1C1917" strokeWidth="3.5" />
          <path d="M120 56 C134 50, 152 50, 166 56" stroke="#5B6BFF" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
          {overallLvl === -1 ? (
            <g id="face-neutral">
              <circle cx="133" cy="74" r="4.5" fill="#FFFDF8" />
              <circle cx="167" cy="74" r="4.5" fill="#FFFDF8" />
              <line x1="138" y1="88" x2="162" y2="88" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
            </g>
          ) : overallLvl === 0 ? (
            <g id="face-happy">
              {vitals.mood === 'excelente' ? (
                <>
                  <path d="M127 75 Q133 68 139 75" stroke="#FFFDF8" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  <path d="M161 75 Q167 68 173 75" stroke="#FFFDF8" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  <path d="M135 85 Q150 99 165 85" stroke="#18C97E" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                </>
              ) : (
                <>
                  <circle cx="133" cy="74" r="4.5" fill="#FFFDF8" />
                  <circle cx="167" cy="74" r="4.5" fill="#FFFDF8" />
                  <path d="M138 87 Q150 97 162 87" stroke="#18C97E" strokeWidth="4" strokeLinecap="round" fill="none" />
                </>
              )}
            </g>
          ) : overallLvl === 1 ? (
            <g id="face-tired">
              {vitals.mood === 'cansado' ? (
                <>
                  <circle cx="133" cy="74" r="4" fill="#FFFDF8" />
                  <circle cx="167" cy="74" r="4" fill="#FFFDF8" />
                  <path d="M140 88 Q150 91 160 88" stroke="#FFB800" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                </>
              ) : (
                <>
                  <line x1="127" y1="74" x2="139" y2="74" stroke="#FFFDF8" strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="161" y1="74" x2="173" y2="74" stroke="#FFFDF8" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M140 90 Q150 85 160 90" stroke="#FFB800" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                </>
              )}
            </g>
          ) : (
            <g id="face-alert">
              <path d="M128 70 L138 78 M138 70 L128 78" stroke="#FFFDF8" strokeWidth="3" strokeLinecap="round" />
              <path d="M162 70 L172 78 M172 70 L162 78" stroke="#FFFDF8" strokeWidth="3" strokeLinecap="round" />
              <ellipse cx="150" cy="91" rx="7" ry="5" fill="#FF3B4E" />
            </g>
          )}
          <g className="hotspot" role="button" tabIndex={0} aria-label={`Corazón: ${levelStatusLabel(heartLvl)} — abrir controles`} onClick={() => onHighlightSystem('heart')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onHighlightSystem('heart'); } }}>
            <circle cx="150" cy="166" r="24" fill="transparent" />
            <circle cx="150" cy="166" r="19" fill="#FFFDF8" stroke="#1C1917" strokeWidth="3" />
            <path id="node-heart" d="M150 176 C150 176 138 168 138 161 A5.5 5.5 0 0 1 150 159 A5.5 5.5 0 0 1 162 161 C162 168 150 176 150 176Z" fill={colorForLevel(heartLvl)} stroke="#1C1917" strokeWidth="2.2" />
          </g>
          <g className="hotspot" role="button" tabIndex={0} aria-label={`Cuerpo: ${levelStatusLabel(bodyLvl)} — abrir controles`} onClick={() => onHighlightSystem('body')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onHighlightSystem('body'); } }}>
            <rect x="126" y="180" width="48" height="48" fill="transparent" />
            <rect id="node-body" x="136" y="194" width="28" height="20" rx="6" fill={colorForLevel(bodyLvl)} stroke="#1C1917" strokeWidth="2.8" />
            <polygon points="151,197 146,204 150,204 149,211 154,203 150,203" fill="#1C1917" />
          </g>
        </svg>
      </div>
    </div>
  );
}
