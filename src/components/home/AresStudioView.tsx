'use client';

import dynamic from 'next/dynamic';
import { AresIcon } from '@/components/ui/Icons';
import './studio/nasa-panel.css';
import './studio/mission-modal.css';
import { AstroTabPanel } from './studio/AstroTabPanel';
import { AstroStageCard } from './studio/AstroStageCard';
import { ControlsTabPanel } from './studio/ControlsTabPanel';
import { MissionsTabPanel } from './studio/MissionsTabPanel';
import { MonitorTabPanel } from './studio/MonitorTabPanel';
import type { TabKey } from './studio/studio-types';
import { STUDIO_NAV_ITEMS, StudioNavIcon } from './studio/StudioNavSvg';
import { useAresStudio } from './studio/useAresStudio';

const TabLoadingFallback = () => (
  <div className="card empty-message" aria-busy="true">
    Cargando panel...
  </div>
);

const NasaTabPanel = dynamic(
  () => import('./studio/NasaTabPanel').then((mod) => mod.NasaTabPanel),
  { loading: TabLoadingFallback }
);

const MissionActionModal = dynamic(
  () => import('./studio/MissionActionModal').then((mod) => mod.MissionActionModal),
  { ssr: false }
);

interface AresStudioViewProps {
  initialTab?: TabKey;
}

export function AresStudioView({ initialTab = 'astro' }: AresStudioViewProps) {
  const s = useAresStudio(initialTab);
  const activeNav = STUDIO_NAV_ITEMS.find((item) => item.key === s.tab);
  const isAstroTab = s.tab === 'astro';
  const isControlsTab = s.tab === 'controls';
  const isMissionsTab = s.tab === 'missions';
  const isCleanTopbar = isControlsTab || isMissionsTab;
  const isModalOpen = Boolean(s.activeMissionScene);
  const showToast = Boolean(s.toastMsg) && s.activeMissionScene?.actionId !== 'comms';
  const doneCount = isControlsTab
    ? 0
    : s.missions.filter((mission) => mission.completed || s.completedLocalIds.includes(mission.id)).length;
  const authError = s.authError;
  const refreshAction = () => void s.refreshState();

  const authRetryBanner = authError ? (
    <>
      <span className="session-pill" style={{ background: 'var(--red-bg)' }}>
        {authError}
      </span>
      <button type="button" className="btn-tactile" onClick={refreshAction}>
        Reintentar
      </button>
    </>
  ) : null;
  const showCleanTopbarAuth = isMissionsTab ? Boolean(!s.state && authRetryBanner) : Boolean(authRetryBanner);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div inert={isModalOpen} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <header className={`topbar${isAstroTab ? ' topbar-astro' : isCleanTopbar ? ' topbar-astro topbar-clean' : ''}`}>
          <div className="brand">
            <div className="brand-badge"><AresIcon name="user" size={24} /></div>
            <div>
              <span className="brand-title">ARES Orbit</span>
            </div>
          </div>
          {isCleanTopbar ? (
            showCleanTopbarAuth ? (
              <div className="topbar-right">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  {authRetryBanner}
                </div>
              </div>
            ) : null
          ) : (
          <div className="topbar-right">
            {s.state ? (
              <>
                {!isAstroTab ? (
                  <span className="session-pill topbar-user-pill">
                    <AresIcon name="user" size={16} /> {s.state.user.name}
                  </span>
                ) : null}
                <span className="val-pill">
                  Protocolos {doneCount}/{s.missions.length}
                </span>
                {!isAstroTab ? (
                  <span className="val-pill">
                    <AresIcon name="activity" size={16} /> {s.state.gamification.streak}d
                  </span>
                ) : null}
              </>
            ) : authRetryBanner ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                {authRetryBanner}
              </div>
            ) : (
              <span className="session-pill">Modo Demo · Cmdr. Elena Vance</span>
            )}
          </div>
        )}
      </header>

      <div className="app-layout">
        <nav className="sidebar-nav" aria-label="Secciones ARES Orbit">
          <div className="sidebar-brand">
            <div className="brand-badge"><AresIcon name="user" size={24} /></div>
            <div>
              <span className="brand-title">ARES Orbit</span>
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
              <StudioNavIcon tab={item.key} active={s.tab === item.key} />
              <span>{item.label}</span>
            </button>
          ))}
          {isAstroTab ? (
            s.state ? (
              <div className="sidebar-status">
                <span className="val-pill">
                  Protocolos {doneCount}/{s.missions.length}
                </span>
              </div>
            ) : authRetryBanner ? (
              <div className="sidebar-status" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {authRetryBanner}
              </div>
            ) : null
          ) : (
            <>
              {authRetryBanner ? (
                <div className="sidebar-status" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {authRetryBanner}
                </div>
              ) : null}
              <div className="sidebar-astronaut">
                <AstroStageCard
                  evaluation={s.evaluation}
                  vitals={s.activeVitals}
                  onHighlightSystem={s.handleHighlightSystem}
                />
              </div>
            </>
          )}
        </nav>

        <main id="main-content" className="view-container">
          {isAstroTab ? (
            <h1 className="sr-only">{activeNav?.label ?? 'Astronauta'}</h1>
          ) : (
            <h1 className="view-heading">
              {isControlsTab ? 'Registrar signos' : (activeNav?.label ?? 'ARES Orbit')}
            </h1>
          )}
          {isAstroTab ? (
            <AstroTabPanel
              evaluation={s.evaluation}
              vitals={s.activeVitals}
              context={s.context}
              stressMode={s.stressMode}
              onStressModeChange={s.setStressMode}
              activeSimulation={s.activeSimulation}
              activeNasaReplay={s.activeNasaReplay}
              hasSavedHistory={(s.state?.observations.length ?? 0) > 0}
              onHighlightSystem={s.handleHighlightSystem}
              onClearReplayOrSim={s.handleClearReplayOrSim}
              onNavigateTab={s.switchTab}
              onRunScenario={(id) => void s.handleRunScenario(id)}
              onResetDemo={() => void s.handleResetDemo()}
              onActionMission={(id) => void s.handleCompleteMission(id)}
              onOpenBreather={s.handleOpenBreather}
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
              isSimulationOrReplay={s.isSimulationOrReplay}
              onUpdateNumeric={s.handleUpdateNumeric}
              onUpdateMood={s.handleUpdateMood}
              onToggleSystemMeasured={s.handleToggleSystemMeasured}
              onChangeContext={s.handleChangeContext}
              onRunScenario={(id) => void s.handleRunScenario(id)}
              onResetDemo={() => void s.handleResetDemo()}
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
              hydrationLevel={s.hydrationLevel}
              exerciseStep={s.exerciseStep}
              restNightActive={s.restNightActive}
              breathRounds={s.breathRounds}
              commsSending={s.commsSending}
              commsSentAt={s.commsSentAt}
              onCompleteMission={(id) => void s.handleCompleteMission(id)}
              onAdvanceExercise={() => void s.handleAdvanceExercise()}
              onToggleRest={() => void s.handleToggleRest()}
              onCompleteBreathRound={() => void s.handleCompleteBreathRound()}
              onOpenBreather={s.handleOpenBreather}
              onResetMissions={() => void s.resetMissions()}
              onPingEarth={() => void s.handlePingEarth({ openScene: true })}
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
            <StudioNavIcon tab={item.key} active={s.tab === item.key} />
            <span>{item.mobileLabel}</span>
          </button>
        ))}
      </nav>
      </div>

      {s.activeMissionScene ? (
        <MissionActionModal
          key={s.activeMissionScene.key}
          open={true}
          actionId={s.activeMissionScene.actionId}
          variant={s.activeMissionScene.variant}
          copyContext={{
            restrictionReason: s.activeMissionScene.restrictionReason ?? null,
            overallStatus: s.evaluation.overallStatus,
            readinessScore: s.evaluation.readinessScore,
            copiedToClipboard: s.lastCommsCopied,
            sentAt: s.commsSentAt,
            commsSending: s.commsSending,
            commsError: s.commsError,
          }}
          onClose={s.closeMissionScene}
          onAnimatingComplete={(completedActionId) => {
            if (completedActionId === 'breathe') {
              void s.persistMissionCompletion('breathe');
            }
          }}
          onGoToControls={() => s.switchTab('controls')}
          onOpenBreatherFromBlocked={s.handleOpenBreather}
          onRetryComms={() => void s.handlePingEarth()}
        />
      ) : null}

      <div className={`toast${showToast ? ' show' : ''}`} role="status" aria-live="polite">
        {showToast ? s.toastMsg : ''}
      </div>
    </div>
  );
}
