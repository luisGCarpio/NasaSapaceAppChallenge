'use client';

import { useRouter } from 'next/navigation';
import { useAres } from '@/context/AresContext';
import { useCheckinDraft } from '@/hooks/useCheckinDraft';
import { CheckinForm } from './CheckinForm';
import { PreliminaryPreview } from './PreliminaryPreview';

export function CheckinView() {
  const router = useRouter();
  const { state, applyUpdatedState, clearSimulation, clearNasaReplay } = useAres();
  const {
    draft,
    context,
    previewEvaluation,
    saving,
    submitFeedback,
    setField,
    setContextField,
    loadBaseline,
    clearDraft,
    submitCheckin,
  } = useCheckinDraft(state?.currentVitals ?? null, state?.currentContext ?? null, (next) => {
    clearSimulation();
    clearNasaReplay();
    applyUpdatedState(next);
  });

  if (!state) return null;

  async function handleSaveAndNavigate() {
    const ok = await submitCheckin();
    if (ok) {
      window.setTimeout(() => router.push('/'), 500);
    }
    return ok;
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <CheckinForm
          draft={draft}
          context={context}
          specs={state.vitalSpecs}
          evaluation={previewEvaluation}
          baselineVitals={state.currentVitals}
          saving={saving}
          feedback={submitFeedback}
          onChangeField={setField}
          onChangeContext={setContextField}
          onLoadBaseline={loadBaseline}
          onClear={clearDraft}
          onSubmit={handleSaveAndNavigate}
        />
      </div>
      <div className="lg:col-span-5">
        <PreliminaryPreview evaluation={previewEvaluation} />
      </div>
    </div>
  );
}
