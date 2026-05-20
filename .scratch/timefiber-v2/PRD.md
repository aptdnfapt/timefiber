# PRD: TimeFiber v2

Status: needs-triage

## Problem Statement

The current time-logging app (LogTracker) is a single-user diary-table tool. It lacks privacy controls (no screen lock), has a bare theme picker that clutters the header, uses broken markdown rendering (quotes mangled into HTML artifacts, no fenced code blocks), lacks image support in activity entries, and carries the wrong project name everywhere.

## Solution

A v2 upgrade that adds screen-lock privacy, a proper floating settings panel, configurable auto-lock, a full markdown rewrite with syntax-highlighted code blocks, image upload/thumbnail/lightbox support in activity cells, and a complete rename to "TimeFiber" throughout the codebase.

## User Stories

1. As a privacy-conscious user, I want to lock the screen so my data is hidden when I step away
2. As a user who just refreshed the page, I want the lock to appear before any data loads so nothing leaks
3. As a user, I want to unlock with my password (not a separate PIN) so I don't need to remember two secrets
4. As a user, I want a unified settings window so I can configure the app from one place
5. As a user, I want to change themes from the settings window so the header stays clean
6. As a user, I want to set an auto-lock timer so the app locks itself after inactivity
7. As a user, I want auto-lock to be off by default so I opt into it when ready
8. As a user, I want to pick from preset auto-lock durations (off/1/5/15/30/60 min) so I don't have to type numbers
9. As a user writing markdown, I want single and double quotes to render normally so my text isn't corrupted
10. As a user writing markdown, I want fenced code blocks (```) to render with syntax highlighting so code is readable
11. As a user, I want headers (h1/h2/h3) to stay the same text size as body but be visually distinct via color and weight
12. As a user, I want all markdown colors to change with the active theme so it always looks cohesive
13. As a user, I want to paste images from clipboard into activity cells so I can quickly add screenshots
14. As a user, I want to drag and drop images into activity cells so I can add images from my file manager
15. As a user, I want a file-picker button in the activity cell (editing mode) so I can browse for images
16. As a user, I want images to appear as small inline thumbnails in the activity text so they don't disrupt reading
17. As a user, I want to click a thumbnail to see the full image in a lightbox overlay
18. As a user, I want uploaded images stored as optimized AVIF/WebP so they load fast
19. As a user, I want the app to be called "TimeFiber" everywhere — login screen, header, page title, and code

## Implementation Decisions

### Decision 1: Lock is an overlay, not a re-login

The lock keeps the JWT token valid and entries in React state. On refresh, the app checks: token exists → shows LockOverlay before any API calls → user enters password → verified via `/api/auth/verify` → overlay lifts → data fetches. No localStorage flag for lock state — in-memory only, so refresh always re-locks.

### Decision 2: LockOverlay component

Full-screen blur overlay with centered password form. Calls `POST /api/auth/verify` with password. On success, calls parent unlock callback. Closes only on correct password.

### Decision 3: LockManager — pure state module

Exposes:
- `useLockManager()` hook returning `{ locked, lock(), unlock(password), setAutoLockTimeout(minutes) }`
- Inactivity timer: listens to `pointermove`, `keydown`, `scroll`, `mousedown` events. Resets timer on activity. When timer fires → calls `lock()`
- On mount: if token exists in localStorage → sets `locked: true` immediately (even before any API call)
- `unlock(password)` calls `/api/auth/verify` → on success sets `locked: false`
- Timer config persisted in localStorage under `timefiber_autolock_timeout`

### Decision 4: SettingsModal — centered floating window

Modal with backdrop blur, Escape/click-outside to close. Contains:
- Theme picker section (moved from header `ThemeSelector` — current component repurposed)
- Auto-lock timeout dropdown: Off, 1 min, 5 min, 15 min, 30 min, 60 min
- Designed for future sections to be added (data export, about, etc.)

ThemeSelector in header is replaced with a gear icon button that opens SettingsModal.

### Decision 5: MarkdownRenderer — pure function module

Signature: `renderMarkdown(raw: string): string`

Uses `marked` with GFM + breaks enabled. **No custom renderer** — the quote-highlight regex hack is removed entirely.

`highlight.js` integrated for fenced code blocks. Language auto-detection for unlabeled blocks.

All output elements get class `md-render` for CSS targeting. Headers forced to 1em via CSS — distinguished only by color and font-weight:
- h1: bold + accent color
- h2: bold + text-main color
- h3: semibold + accent color
- h4-h6: semibold + text-muted color

New CSS vars added for syntax highlighting tokens per theme:
- `--md-code-bg` (code block background)
- `--md-code-keyword` (keywords in code)
- `--md-code-string` (strings in code)
- `--md-code-comment` (comments in code)
- `--md-code-function` (function names)

### Decision 6: EditableCell — image-aware rewrite

The markdown mode of `EditableCell` is extended:

**Edit mode additions:**
- Paste handler: checks `clipboardData.items` for images → detected → upload → insert `![](url)` at cursor
- Drag-drop handler: `onDrop` → check `dataTransfer.files` for images → upload → insert `![](url)` at drop position
- File-picker: small icon button (📷 or upload icon) at bottom-right of cell in edit mode. Opens `<input type="file" accept="image/*">`

**Display mode additions:**
- Renders markdown through `MarkdownRenderer`
- Inline images (`<img>` tags in rendered HTML) shown as thumbnails (`max-width: 200px`, `max-height: 150px`, `border-radius: 4px`, `cursor: pointer`)
- Click on thumbnail → opens `ImageLightbox` with full-size AVIF source

### Decision 7: ImageLightbox component

Props: `{ src: string, onClose: () => void }`

Full-screen overlay, image centered at natural size (max 90vw/90vh). Close on Escape/click-outside/click X button.

### Decision 8: ImageUpload — server-side with sharp

`POST /api/uploads`:
- Receives multipart form data (field: `image`)
- Validates file type (image/*)
- Generates unique filename with crypto `randomUUID()`
- Uses `sharp` to produce two outputs:
  - AVIF (quality 50, max 1200px wide) → `data/uploads/<uuid>.avif`
  - WebP (quality 80, max 1200px wide) → `data/uploads/<uuid>.webp`
- Returns JSON: `{ url: "/uploads/<uuid>" }` (no extension — client adds `.avif`/`.webp`)
- `data/uploads/` is served statically via existing express.static or a dedicated route

No original stored. Only the two optimized copies.

### Decision 9: Picture tag for inline images

Rendered markdown image output uses `<picture>`:
```html
<picture>
  <source srcset="/uploads/abc.avif" type="image/avif">
  <img src="/uploads/abc.webp" loading="lazy" class="md-img-inline" onclick="lightbox">
</picture>
```

Lightbox always loads the AVIF version.

### Decision 10: auth/verify endpoint

`POST /api/auth/verify`:
- Body: `{ password: string }`
- Compares against `APP_PASSWORD` env var
- Returns `{ valid: true }` on match, `401` on mismatch
- Does NOT issue a token
- No rate limiting needed (single-user, local app)

### Decision 11: Rename to TimeFiber

All user-facing strings change from LogTracker → TimeFiber:
- `App.tsx` header title and subtitle
- `Login.tsx` heading and subtitle
- `index.html` `<title>` tag
- `package.json` name fields (root, server, client)
- `README.md` title and references
- localStorage key: `chrono_theme` → `timefiber_theme`
- `.env.example` comments (if any reference old name)

Directory name (`time-log`) stays unchanged.

### Decision 12: Database — no schema changes needed

The `entries.activity` column already stores text (markdown). Image markdown `![](url)` fits in the existing TEXT column. No migration.

### Decision 13: CSS — all markdown colors are theme-aware

Existing `--md-*` vars on `:root` and `[data-theme="..."]` selectors already cover h1-h6, strong, em, code, quote. New vars for syntax highlighting added to the same theme blocks.

## Testing Decisions

### What makes a good test
- Test external behavior (input → output), not internal implementation
- For pure logic modules: input string → output string or state machine transitions
- For HTTP endpoints: request → response + side effects (files created)
- Mock external dependencies (timers, file system)

### Modules to test

**LockManager (`client/src/lib/lock.ts`)**
- On mount with token → locked is true, no API call made
- On mount without token → locked is false
- unlock() with correct password → locked becomes false
- unlock() with wrong password → locked stays true, error returned
- Inactivity timer fires after configured timeout → locked becomes true
- Activity resets timer
- Timer config persists to localStorage

**MarkdownRenderer (`client/src/lib/markdown.ts`)**
- Plain text passes through unchanged
- Bold/italic rendered correctly
- Headers have correct classes and no size inflation
- Fenced code block with language → syntax-highlighted HTML
- Fenced code block without language → auto-detected or plain
- Inline code wrapped in `<code>` tags
- Quotes (`'...'` and `"..."`) NOT mangled — rendered as plain text
- Links rendered with `target="_blank"`
- Image markdown produces `<picture>` with AVIF source + WebP fallback

**ImageUpload (`server/routes/uploads.ts`)**
- Valid image upload → creates .avif and .webp files in data/uploads/
- Returns correct URL
- Invalid file type → rejected with 400
- Missing file → rejected with 400

### Prior art
No existing tests in the codebase. Tests follow the pattern of unit tests for pure modules and integration tests for endpoints. Use `vitest` for client-side tests (already available in client devDependencies) and `vitest` or plain Node test runner for server-side.

## Out of Scope

- Multi-user support
- Cloud sync / backup
- Mobile native app
- Export to PDF/CSV
- Password change UI (still via .env)
- Image deletion from server (no orphan cleanup yet)
- Video support
- Rich text editing (staying with markdown)
- Keyboard shortcut customization
- Dark mode toggle separate from themes (themes already handle light/dark)

## Further Notes

- `sharp` needs to be installed in the server — it compiles native libvips bindings, may need build-essential on Linux
- `highlight.js` and `marked` are already in client dependencies, confirm versions are recent
- The settings modal should be designed with an extension point pattern so future settings sections just slot in without refactoring the modal shell
