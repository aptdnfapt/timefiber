# 01 — Rename to TimeFiber

Status: needs-triage

## Parent

PRD: `.scratch/timefiber-v2/PRD.md`

## What to build

Rename the application from "LogTracker" / "Chronolog" to "TimeFiber" in all user-facing text, package names, and internal identifiers. The filesystem directory (`time-log`) stays unchanged.

Everything that a user sees or a developer references by name should say TimeFiber.

## Acceptance criteria

- [ ] Login screen heading and subtitle say "TimeFiber"
- [ ] App header title and subtitle say "TimeFiber"
- [ ] Browser tab `<title>` says "TimeFiber"
- [ ] Root `package.json` name field is `timefiber`
- [ ] Server `package.json` name field is `timefiber-server`
- [ ] Client `package.json` name field is `timefiber-client`
- [ ] README.md title and all references updated
- [ ] localStorage key `chrono_theme` renamed to `timefiber_theme`
- [ ] No remaining references to LogTracker or Chronolog in UI, config, or .env.example files
- [ ] App still builds and runs after rename

## Blocked by

None — can start immediately
