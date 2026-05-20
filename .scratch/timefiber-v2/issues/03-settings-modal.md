# 03 — SettingsModal + Theme migration

Status: needs-triage

## Parent

PRD: `.scratch/timefiber-v2/PRD.md`

## What to build

A centered floating settings window (modal with backdrop) that replaces the current theme buttons in the header. The settings modal contains the theme picker and the auto-lock timeout dropdown, with an extension point pattern for future settings sections.

The theme buttons currently in the header (`ThemeSelector` component as icon buttons) are replaced with a single gear icon that opens this modal.

**SettingsModal component:**
- Centered floating window with backdrop blur
- Close on Escape key, click-outside, or X button
- Theme picker section using the existing ThemeSelector logic (repurposed from current header component)
- Auto-lock timeout section: dropdown with options Off / 1 min / 5 min / 15 min / 30 min / 60 min. Reads/writes `timefiber_autolock_timeout` localStorage key. Calls `setAutoLockTimeout()` from LockManager
- Structured with extensible sections so future settings (data export, about, etc.) can slot in without refactoring the modal shell

**Header change:**
- Remove `ThemeSelector` component from header
- Add gear/cog icon button that opens SettingsModal

## Acceptance criteria

- [ ] Clicking gear icon in header opens SettingsModal
- [ ] SettingsModal is centered on screen with backdrop blur
- [ ] Clicking outside modal closes it
- [ ] Pressing Escape closes it
- [ ] Clicking X button closes it
- [ ] Theme picker inside modal works — selecting a theme applies it immediately
- [ ] Active theme is visually indicated in the picker
- [ ] Auto-lock timeout dropdown shows Off / 1 min / 5 min / 15 min / 30 min / 60 min
- [ ] Selecting a timeout calls LockManager's setAutoLockTimeout
- [ ] Selected timeout value persists across page refreshes
- [ ] Theme buttons no longer appear in the header
- [ ] Header layout still looks clean with just app title + gear icon + Add button

## Blocked by

- #02 — Lock system (needs LockManager's `setAutoLockTimeout` to exist)
