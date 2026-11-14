'use client';

import type { ReactNode } from 'react';
import { useAres } from '@/context/AresContext';
import { AuthView } from '../auth/AuthView';
import { ScenarioDrawer } from '../home/ScenarioDrawer';
import { CommsReportModal } from '../wellness/CommsReportModal';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { SimulationBanner } from './SimulationBanner';

export function AppShell({ children }: { children: ReactNode }) {
  const { state, loading } = useAres();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060A12] px-4">
        <div className="w-full max-w-md space-y-3 rounded-2xl border border-[#1E2E4E] bg-[#0B1220] p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-800" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-900" />
        </div>
      </div>
    );
  }

  if (!state) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <AppHeader />
      <div className="mx-auto flex max-w-7xl">
        <DesktopSidebar />
        <main className="min-w-0 flex-1 px-4 py-5 pb-24 sm:px-6 md:pb-10">
          <SimulationBanner />
          {children}
        </main>
      </div>
      <BottomNav />
      <ScenarioDrawer />
      <CommsReportModal />
    </div>
  );
}
