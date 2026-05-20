import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../api', () => ({
  api: {
    verifyPassword: vi.fn(),
  },
}));

import { useLockManager } from './lock';
import { api } from '../api';
import { act, renderHook } from '@testing-library/react';

function setToken(val: string | null) {
  if (val) localStorage.setItem('auth_token', val);
  else localStorage.removeItem('auth_token');
}

function setAutolock(minutes: number) {
  localStorage.setItem('timefiber_autolock_timeout', String(minutes));
}

describe('LockManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets locked=true on mount when token exists', () => {
    setToken('fake-jwt');
    const { result } = renderHook(() => useLockManager());
    expect(result.current.locked).toBe(true);
  });

  it('sets locked=false on mount when no token', () => {
    const { result } = renderHook(() => useLockManager());
    expect(result.current.locked).toBe(false);
  });

  it('does not call any API on mount (even with token)', () => {
    setToken('fake-jwt');
    renderHook(() => useLockManager());
    expect(api.verifyPassword).not.toHaveBeenCalled();
  });

  it('unlock with correct password sets locked=false', async () => {
    setToken('fake-jwt');
    vi.mocked(api.verifyPassword).mockResolvedValue({ valid: true });
    const { result } = renderHook(() => useLockManager());
    expect(result.current.locked).toBe(true);

    let ok = false;
    await act(async () => {
      ok = await result.current.unlock('correct');
    });
    expect(ok).toBe(true);
    expect(result.current.locked).toBe(false);
  });

  it('unlock with wrong password keeps locked=true', async () => {
    setToken('fake-jwt');
    vi.mocked(api.verifyPassword).mockRejectedValue(new Error('Wrong'));
    const { result } = renderHook(() => useLockManager());
    expect(result.current.locked).toBe(true);

    let ok = true;
    await act(async () => {
      ok = await result.current.unlock('wrong');
    });
    expect(ok).toBe(false);
    expect(result.current.locked).toBe(true);
  });

  it('lock() sets locked=true', () => {
    const { result } = renderHook(() => useLockManager());
    expect(result.current.locked).toBe(false);

    act(() => {
      result.current.lock();
    });
    expect(result.current.locked).toBe(true);
  });

  it('auto-lock fires after configured timeout', () => {
    setAutolock(1);
    const { result } = renderHook(() => useLockManager());
    expect(result.current.locked).toBe(false);

    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(result.current.locked).toBe(true);
  });

  it('activity resets the auto-lock timer', () => {
    setAutolock(1);
    const { result } = renderHook(() => useLockManager());
    expect(result.current.locked).toBe(false);

    act(() => {
      vi.advanceTimersByTime(30_000);
      window.dispatchEvent(new Event('keydown'));
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.locked).toBe(false);

    act(() => {
      vi.advanceTimersByTime(65_000);
    });
    expect(result.current.locked).toBe(true);
  });

  it('auto-lock does not fire when timeout is 0', () => {
    setAutolock(0);
    const { result } = renderHook(() => useLockManager());
    expect(result.current.locked).toBe(false);

    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(result.current.locked).toBe(false);
  });

  it('does not auto-lock if already locked', () => {
    setToken('fake-jwt');
    setAutolock(1);
    const { result } = renderHook(() => useLockManager());
    expect(result.current.locked).toBe(true);

    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(result.current.locked).toBe(true);
  });

  it('setAutoLockTimeout persists config to localStorage', () => {
    const { result } = renderHook(() => useLockManager());

    act(() => {
      result.current.setAutoLockTimeout(15);
    });
    expect(localStorage.getItem('timefiber_autolock_timeout')).toBe('15');
  });

  it('setAutoLockTimeout to 0 clears timer', () => {
    setAutolock(5);
    const { result } = renderHook(() => useLockManager());

    act(() => {
      result.current.setAutoLockTimeout(0);
    });

    act(() => {
      vi.advanceTimersByTime(600_000);
    });
    expect(result.current.locked).toBe(false);
  });

  it('cleans up event listeners and timers on unmount', () => {
    setAutolock(1);
    const { result, unmount } = renderHook(() => useLockManager());

    act(() => {
      unmount();
      vi.advanceTimersByTime(120_000);
    });
    expect(result.current.locked).toBe(false);
  });
});
