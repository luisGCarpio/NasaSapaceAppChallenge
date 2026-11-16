import type { CSSProperties } from 'react';

export const SR_ONLY_STYLE: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export const BREATHE_RING_RADIUS = 76;
export const BREATHE_RING_CIRCUMFERENCE = 2 * Math.PI * BREATHE_RING_RADIUS;

export function getBreathOrbScale(progress: number): number {
  if (progress < 0.34) {
    const t = progress / 0.34;
    return 0.78 + 0.34 * t;
  }
  if (progress < 0.62) {
    return 1.12;
  }
  const t = Math.min(1, (progress - 0.62) / 0.38);
  return 1.12 - 0.34 * t;
}

export function isElementFocusable(el: HTMLElement): boolean {
  return (
    el.isConnected &&
    el.getAttribute('aria-hidden') !== 'true' &&
    !el.hasAttribute('disabled') &&
    el.getAttribute('aria-disabled') !== 'true' &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== 'hidden'
  );
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([aria-disabled="true"]), [href]:not([aria-disabled="true"]), input:not([disabled]):not([aria-disabled="true"]), select:not([disabled]):not([aria-disabled="true"]), textarea:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-disabled="true"])'
    )
  ).filter(isElementFocusable);
}

export function restoreFocusSafely(prev: HTMLElement | null): void {
  if (prev && isElementFocusable(prev)) {
    prev.focus();
    return;
  }
  const mainContent = document.getElementById('main-content');
  const visibleHeading = Array.from(document.querySelectorAll<HTMLElement>('h1, h2')).find(
    (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
  );
  const fallback = mainContent ?? visibleHeading ?? null;
  if (fallback) {
    if (!fallback.hasAttribute('tabindex')) {
      fallback.setAttribute('tabindex', '-1');
    }
    fallback.focus({ preventScroll: true });
  }
}

