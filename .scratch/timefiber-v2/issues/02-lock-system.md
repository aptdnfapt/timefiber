# 02 — Lock system (endpoint + overlay + LockManager + auto-lock)

Status: needs-triage

## Parent

PRD: `.scratch/timefiber-v2/PRD.md`

## What to build

Full screen-lock privacy system: a verify endpoint on the server, a lock overlay UI, a LockManager state hook with inactivity-based auto-lock, and tests.

**Server: `POST /api/auth/verify`**
Receives `{ password }`, compares against `APP_PASSWORD` env var. Returns `{ valid: true }` on match, 401 on mismatch. Does not issue a token.

**Client: LockOverlay component**
Full-screen blurred overlay with centered password input. Calls verify endpoint. On correct password calls parent unlock callback. No other way to dismiss.

**Client: LockManager hook (`useLockManager`)**
Returns `{ locked, lock(), unlock(password), setAutoLockTimeout(minutes) }`.

On mount: if a JWT token exists in localStorage → immediately sets `locked: true` (before any API call happens — prevents data flash on refresh). No token → `locked: false`.

Inactivity timer: listens to `pointermove`, `keydown`, `scroll`, `mousedown` events. Resets timer on activity. When timer reaches configured timeout → calls `lock()`. Timer config persisted in localStorage under `timefiber_autolock_timeout`.

`unlock(password)`: calls `/api/auth/verify` → on success sets `locked: false`, on failure returns error.

**Integration in App.tsx**
When `locked` is true → render LockOverlay (nothing else). When unlocked → normal app. Token stays valid throughout — no API calls happen until unlocked.

Auto-lock defaults to Off (0 minutes).

## Acceptance criteria

- [ ] `POST /api/auth/verify` with correct password returns `{ valid: true }`
- [ ] `POST /api/auth/verify` with wrong password returns 401
- [ ] LockOverlay renders full-screen with blur, centered password form
- [ ] LockOverlay cannot be dismissed without correct password
- [ ] On page refresh with valid token → lock overlay shows immediately, no data flash
- [ ] On page refresh without token → login screen shows (existing behavior)
- [ ] Clicking "Lock" locks the screen
- [ ] Unlocking with correct password reveals the app, data loads
- [ ] Auto-lock fires after configured inactivity timeout
- [ ] User activity (mouse, keyboard, scroll) resets the inactivity timer
- [ ] Auto-lock timeout config persists across page refreshes
- [ ] Lock state is NOT persisted to localStorage — refresh always re-locks if token exists
- [ ] LockManager tests pass: mount states (no API call on mount-with-token), unlock success/failure, timer fire, timer reset, config persistence

## Blocked by

- #01 — Rename to TimeFiber (the overlay UI shows the app name)
