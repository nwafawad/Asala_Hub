import { flushSync } from 'react-dom';

/**
 * Executes a state update wrapped in document.startViewTransition if supported.
 * Falls back to direct synchronous execution if unsupported or if prefers-reduced-motion is active.
 * Gracefully catches AbortError when a transition is skipped.
 */
export function startViewTransition(updateFn: () => void): void {
  if (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    try {
      const transition = (document as any).startViewTransition(() => {
        try {
          flushSync(() => {
            updateFn();
          });
        } catch {
          updateFn();
        }
      });

      if (transition?.finished && typeof transition.finished.catch === 'function') {
        transition.finished.catch(() => {
          // Suppress AbortError: Transition was skipped
        });
      }
      if (transition?.ready && typeof transition.ready.catch === 'function') {
        transition.ready.catch(() => {
          // Suppress AbortError: Transition was skipped
        });
      }
    } catch {
      updateFn();
    }
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
