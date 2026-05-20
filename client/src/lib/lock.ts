import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api';

const AUTOLOCK_KEY = 'timefiber_autolock_timeout';

const ACTIVITY_EVENTS = ['pointermove', 'keydown', 'scroll', 'mousedown'] as const;

export function useLockManager() {
  const [locked, setLocked] = useState(() => {
    const token = localStorage.getItem('auth_token');
    return !!token;
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const getTimeout = useCallback((): number => {
    const raw = localStorage.getItem(AUTOLOCK_KEY);
    const val = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(val) && val > 0 ? val : 0;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    const minutes = getTimeout();
    if (minutes <= 0) return;
    timerRef.current = setTimeout(() => {
      if (!lockedRef.current) {
        setLocked(true);
      }
    }, minutes * 60_000);
  }, [clearTimer, getTimeout]);

  const lock = useCallback(() => {
    clearTimer();
    setLocked(true);
  }, [clearTimer]);

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    try {
      await api.verifyPassword(password);
      setLocked(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const setAutoLockTimeout = useCallback((minutes: number) => {
    localStorage.setItem(AUTOLOCK_KEY, String(minutes));
    clearTimer();
    if (minutes > 0 && !lockedRef.current) {
      startTimer();
    }
  }, [clearTimer, startTimer]);

  useEffect(() => {
    if (!lockedRef.current) {
      startTimer();
    }

    const onActivity = () => {
      if (!lockedRef.current) {
        startTimer();
      }
    };

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }

    return () => {
      clearTimer();
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity);
      }
    };
  }, [startTimer, clearTimer]);

  return { locked, lock, unlock, setAutoLockTimeout };
}
