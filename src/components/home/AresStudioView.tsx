'use client';

import { XP_PER_LEVEL } from '@/domain/missions/mission-catalog';
import { AstroTabPanel } from './studio/AstroTabPanel';
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
  const breathPhase =
    s.breathSec > 6 ? 'Inhala suave...' : s.breathSec > 3 ? 'Sostén...' : 'Exhala lento...';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-badge">👨‍🚀</div>
          <div>
            <h1>ARES Orbit</h1>
            <p>Chequeo Médico del Astronauta</p>
          </div>
        </div>
        <div className="topbar-right">
          {s.state ? (
            <>
              <span className="session-pill">👩‍🚀 {s.state.user.name}</span>
              <span className="val-pill">
                Nv. {s.state.gamification.level} · {s.state.gamification.xpProgressInLevel}/{XP_PER_LEVEL} XP
              </span>
              <span className="val-pill">🔥 {s.state.gamification.streak}d</span>
              <button type="button" className="btn-tactile" onClick={() => void s.logout()}>
                Salir
              </button>
            </>
          ) : (
            <>
              <span className="session-pill">Bitácora limpia (Invitado)</span>
              <button type="button" className="btn-tactile" onClick={() => s.switchTab('controls')}>
                🔐 Iniciar sesión
              </button>
            </>
          )}
        </div>
      </header>

      <div className="app-layout">
        <nav className="sidebar-nav" aria-label="Secciones ARES Orbit">
          {STUDIO_NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-btn${s.tab === item.key ? ' active' : ''}`}
              onClick={() => s.switchTab(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <main className="view-container">
          {s.tab === 'astro' ? (
            <AstroTabPanel
              evaluation={s.evaluation}
              vitals={s.activeVitals}
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
              onToggleMeasured={s.handleToggleMeasured}
              onChangeContext={s.handleChangeContext}
              onRunScenario={(id) => void s.handleRunScenario(id)}
              onClearAllMeasured={s.handleClearAllMeasured}
              onSaveCheckin={() => void s.handleSaveCheckin()}
              onQuickCrewLogin={s.login}
              onCustomLogin={s.login}
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
              activeSubjectId={s.activeNasaReplay?.subjectId ?? null}
              activeObservationId={s.nasaObsId}
              onLoadPointToAstronaut={s.handleLoadReplayPoint}
              onClearReplay={s.handleClearReplayOrSim}
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
            onClick={() => s.switchTab(item.key)}
          >
            {item.icon}
            <span>{item.mobileLabel}</span>
          </button>
        ))}
      </nav>

      <div className={`breath-overlay${s.breathOpen ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Pausa Orbital">
        <div className="breath-modal">
          <h3 style={{ fontSize: '1.25rem', marginBottom: 6 }}>🧘 Pausa Orbital</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', fontWeight: 700 }}>{breathPhase}</p>
          <div className="breath-orb">{s.breathSec}s</div>
          <button type="button" className="btn-tactile" onClick={() => s.setBreathOpen(false)}>
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
