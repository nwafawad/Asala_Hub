import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerOptions {
  timeoutMs: number;
  warningMs?: number;
  onTimeout: () => void;
  onWarning?: () => void;
  enabled?: boolean;
}

const LAST_ACTIVE_KEY = 'asala_last_active_timestamp';

export function useIdleTimer({
  timeoutMs,
  warningMs = 60000,
  onTimeout,
  onWarning,
  enabled = true,
}: UseIdleTimerOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const isWarningShownRef = useRef<boolean>(false);

  const updateLastActive = useCallback(() => {
    const now = Date.now();
    try {
      localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
    } catch {
      // Ignore storage quota or access errors
    }
    return now;
  }, []);

  const getLastActive = useCallback((): number => {
    try {
      const val = localStorage.getItem(LAST_ACTIVE_KEY);
      if (val) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return Date.now();
  }, []);

  const resetTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    isWarningShownRef.current = false;

    if (!enabled || timeoutMs <= 0) return;

    const lastActive = getLastActive();
    const elapsed = Date.now() - lastActive;
    const remainingTime = timeoutMs - elapsed;

    if (remainingTime <= 0) {
      onTimeout();
      return;
    }

    // Schedule Warning
    const warningTime = remainingTime - warningMs;
    if (warningTime > 0) {
      warningRef.current = setTimeout(() => {
        isWarningShownRef.current = true;
        onWarning?.();
      }, warningTime);
    } else if (onWarning && !isWarningShownRef.current) {
      isWarningShownRef.current = true;
      onWarning();
    }

    // Schedule Timeout
    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, remainingTime);
  }, [enabled, timeoutMs, warningMs, getLastActive, onTimeout, onWarning]);

  const handleUserActivity = useCallback(() => {
    if (!enabled) return;
    updateLastActive();
    resetTimers();
  }, [enabled, updateLastActive, resetTimers]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      return;
    }

    updateLastActive();
    resetTimers();

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    // Debounce activity listener to avoid churning timers on rapid mouse movements
    let activityThrottleTimer: NodeJS.Timeout | null = null;
    const throttledHandler = () => {
      if (!activityThrottleTimer) {
        activityThrottleTimer = setTimeout(() => {
          activityThrottleTimer = null;
          handleUserActivity();
        }, 1000);
      }
    };

    events.forEach(event => {
      window.addEventListener(event, throttledHandler, { passive: true });
    });

    // Cross-tab synchronization via localStorage storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVE_KEY) {
        resetTimers();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Tab return check on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const lastActive = getLastActive();
        const elapsed = Date.now() - lastActive;
        if (elapsed >= timeoutMs) {
          onTimeout();
        } else {
          resetTimers();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (activityThrottleTimer) clearTimeout(activityThrottleTimer);
      events.forEach(event => {
        window.removeEventListener(event, throttledHandler);
      });
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, timeoutMs, getLastActive, updateLastActive, resetTimers, handleUserActivity, onTimeout]);

  return {
    resetTimers,
    updateLastActive,
  };
}
