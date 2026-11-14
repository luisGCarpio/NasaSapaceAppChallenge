'use client';

import { useCallback, useState } from 'react';
import type { HealthStatus } from '@/domain/health';
import { apiLogComms } from '@/lib/client-api';
import type { PublicUserState } from '@/server/storage/types';

export interface ClipboardStatus {
  copied: boolean;
  requiresManualCopy: boolean;
  feedbackText: string;
}

export function useClipboardReport(onStateUpdated: (next: PublicUserState) => void) {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<ClipboardStatus | null>(null);

  const copyAndLog = useCallback(
    async (params: { message: string; overallStatus: HealthStatus; readinessScore: number | null }) => {
      setSubmitting(true);
      let copied = false;

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(params.message);
          copied = true;
        } catch {
          copied = false;
        }
      }

      try {
        const res = await apiLogComms({
          message: params.message,
          overallStatus: params.overallStatus,
          readinessScore: params.readinessScore,
          copiedToClipboard: copied,
        });
        onStateUpdated(res.state);
        setStatus({
          copied,
          requiresManualCopy: !copied,
          feedbackText: copied
            ? 'Reporte copiado al portapapeles y registrado en la bitácora.'
            : 'Portapapeles bloqueado por el navegador: selecciona el texto y cópialo manualmente (registrado en bitácora).',
        });
      } catch (err) {
        setStatus({
          copied,
          requiresManualCopy: !copied,
          feedbackText: err instanceof Error ? err.message : 'No se pudo registrar el reporte.',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [onStateUpdated]
  );

  const resetStatus = useCallback(() => setStatus(null), []);

  return { submitting, status, copyAndLog, resetStatus };
}
