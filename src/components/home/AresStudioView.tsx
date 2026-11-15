'use client';

import { useEffect, useRef } from 'react';
import { AresIcon } from '@/components/ui/Icons';
import { XP_PER_LEVEL } from '@/domain/missions/mission-catalog';
import { AstroTabPanel } from './studio/AstroTabPanel';
import { AstroStageCard } from './studio/AstroStageCard';
import { ControlsTabPanel } from './studio/ControlsTabPanel';
import { MissionsTabPanel } from './studio/MissionsTabPanel';
import { MonitorTabPanel } from './studio/MonitorTabPanel';
import { NasaTabPanel } from './studio/NasaTabPanel';
import type { TabKey } from './studio/studio-types';
import { STUDIO_NAV_ITEMS } from './studio/StudioNavSvg';
import { useAresStudio } from './studio/useAresStudio';

interface AresStudioViewProps {
  initialTab?: TabKey;
}

export function AresStudioView({ initialTab = 'astro' }: AresStudioViewProps) {
  const s = useAresStudio(initialTab);
  const activeNav = STUDIO_NAV_ITEMS.find((item) => item.key === s.tab);
  const breathPhase =
    s.breathSec > 6 ? 'Inhala suave...' : s.breathSec > 3 ? 'Sostén...' : 'Exhala lento...';
  const authError = 'authError' in s ? (s as { authError?: string | null }).authError : null;
  const refreshAction =
    'refreshState' in s && typeof (s as { refreshState?: unknown }).refreshState === 'function'
      ? () => void (s as { refreshState: () => Promise<void> }).refreshState()
      : () => window.location.reload();

  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!s.breathOpen) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        s.setBreathOpen(false);
        return;
      }
      if (event.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [s.breathOpen, s.setBreathOpen]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-badge"><AresIcon name="user" size={24} /></div>
          <div>
            <span className="brand-title">ARES Orbit</span>
            <p>Chequeo Médico del Astronauta</p>
          </div>
        </div>
        <div className="topbar-right">
          {s.state ? (
            <>
              <span className="session-pill"><AresIcon name="user" size={16} /> {s.state.user.name}</span>
              <span className="val-pill">
                Nv. {s.state.gamification.level} · {s.state.gamification.xpProgressInLevel}/{XP_PER_LEVEL} XP
              </span>
              <span className="val-pill"><AresIcon name="activity" size={16} /> {s.state.gamification.streak}d</span>
            </>
          ) : authError ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <span className="session-pill" style={{ background: 'var(--red-bg)' }}>
                {authError}
              </span>
              <button type="button" className="btn-tactile" onClick={refreshAction}>
                Reintentar
              </button>
            </div>
          ) : (
            <span className="session-pill">Cargando bitácora local...</span>
          )}
        </div>
      </header>

      <div className="app-layout">
        <nav className="sidebar-nav" aria-label="Secciones ARES Orbit">
          <div className="sidebar-brand">
            <div className="brand-badge"><AresIcon name="user" size={24} /></div>
            <div>
              <span className="brand-title">ARES Orbit</span>
              <p>Chequeo del astronauta</p>
            </div>
          </div>
          {STUDIO_NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-btn${s.tab === item.key ? ' active' : ''}`}
              aria-current={s.tab === item.key ? 'page' : undefined}
              onClick={() => s.switchTab(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          {s.tab !== 'astro' && (
            <div className="sidebar-astronaut">
              <AstroStageCard
                evaluation={s.evaluation}
                vitals={s.activeVitals}
                onHighlightSystem={s.handleHighlightSystem}
              />
            </div>
          )}
        </nav>

        <main className="view-container">
          <h1 className="view-heading">{activeNav?.label ?? 'ARES Orbit'}</h1>
          {s.tab === 'astro' ? (
            <AstroTabPanel
              evaluation={s.evaluation}
              vitals={s.activeVitals}
              context={s.context}
              activeSimulation={s.activeSimulation}
              activeNasaReplay={s.activeNasaReplay}
              hasSavedHistory={(s.state?.observations.length ?? 0) > 0}
              onHighlightSystem={s.handleHighlightSystem}
              onClearReplayOrSim={s.handleClearReplayOrSim}
              onNavigateTab={s.switchTab}
              onActionMission={(id) => void s.handleCompleteMission(id)}
              onOpenBreather={() => {
                s.setBreathSec(10);
                s.setBreathOpen(true);
              }}
              onPingEarth={() => void s.handlePingEarth()}
            />
          ) : s.tab === 'controls' ? (
            <ControlsTabPanel
              onInteract={s.clearHighlight}
              draft={s.draft}
              context={s.context}
              evaluation={s.evaluation}
              highlightedSys={s.highlightedSys}
              userState={s.state}
              saving={s.saving}
              saveMessage={s.saveMessage}
              isSimulationOrReplay={Boolean(s.activeSimulation || s.activeNasaReplay)}
              onUpdateNumeric={s.handleUpdateNumeric}
              onUpdateMood={s.handleUpdateMood}
              onToggleSystemMeasured={s.handleToggleSystemMeasured}
              onChangeContext={s.handleChangeContext}
              onRunScenario={(id) => void s.handleRunScenario(id)}
              onClearAllMeasured={s.handleClearAllMeasured}
              onSaveCheckin={() => void s.handleSaveCheckin()}
            />
          ) : s.tab === 'monitor' ? (
            <MonitorTabPanel
              evaluation={s.evaluation}
              userState={s.state}
              activeNasaReplay={s.activeNasaReplay}
              nasaTimeline={s.nasaTimeline}
              onNavigateTab={s.switchTab}
            />
          ) : s.tab === 'missions' ? (
            <MissionsTabPanel
              evaluation={s.evaluation}
              userState={s.state}
              missions={s.missions}
              completedLocalIds={s.completedLocalIds}
              commsSending={s.commsSending}
              commsSentAt={s.commsSentAt}
              onCompleteMission={(id) => void s.handleCompleteMission(id)}
              onOpenBreather={() => {
                s.setBreathSec(10);
                s.setBreathOpen(true);
              }}
              onResetMissions={() => {
                s.setCompletedLocalIds([]);
                if (s.state) void s.resetMissions();
              }}
              onPingEarth={() => void s.handlePingEarth()}
            />
          ) : (
            <NasaTabPanel
              vitals={s.activeVitals}
              evaluation={s.evaluation}
              context={s.context}
              activeSubjectId={s.activeNasaReplay?.subjectId ?? null}
              activeObservationId={s.nasaObsId}
              onLoadPointToAstronaut={s.handleLoadReplayPoint}
              onClearReplay={s.handleClearReplayOrSim}
              onPingEarth={() => void s.handlePingEarth()}
              onGoToControls={() => s.switchTab('controls')}
            />
          )}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {STUDIO_NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`bottom-nav-btn${s.tab === item.key ? ' active' : ''}`}
            aria-current={s.tab === item.key ? 'page' : undefined}
            onClick={() => s.switchTab(item.key)}
          >
            {item.icon}
            <span>{item.mobileLabel}</span>
          </button>
        ))}
      </nav>

      <div
        className={`breath-overlay${s.breathOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!s.breathOpen}
        aria-label="Pausa Orbital"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            s.setBreathOpen(false);
          }
        }}
      >
        <div className="breath-modal" ref={modalRef}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: 6 }}>Pausa para respirar</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', fontWeight: 700 }}>{breathPhase}</p>
          <div className="breath-orb">{s.breathSec}s</div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn-tactile"
            onClick={() => s.setBreathOpen(false)}
          >
            Cerrar pausa
          </button>
        </div>
      </div>

      <div className={`toast${s.toastMsg ? ' show' : ''}`} role="status" aria-live="polite">
        {s.toastMsg ?? ''}
      </div>
    </div>
  );
}
