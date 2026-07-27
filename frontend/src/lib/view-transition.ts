import { flushSync } from 'react-dom';

/**
 * Executes a state update wrapped in document.startViewTransition if supported.
 * Falls back to direct synchronous execution if unsupported or if prefers-reduced-motion is active.
 */
export function startViewTransition(updateFn: () => void): void {
  if (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    (document as any).startViewTransition(() => {
      flushSync(() => {
        updateFn();
      });
    });
  } else {
    updateFn();
  }
}

/**
 * Custom hook returning a view transition wrapper function.
 */
export function useViewTransition() {
  return (updateFn: () => void) => {
    startViewTransition(updateFn);
  };
}
