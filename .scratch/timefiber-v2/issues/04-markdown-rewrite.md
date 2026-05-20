# 04 — MarkdownRenderer rewrite + EditableCell integration

Status: needs-triage

## Parent

PRD: `.scratch/timefiber-v2/PRD.md`

## What to build

Rewrite the markdown rendering from scratch as a pure function module, integrate `highlight.js` for fenced code block syntax highlighting, then swap it into `EditableCell` to fix the broken quote rendering and add proper code block support. No headers get bigger than normal text — visual distinction is color and weight only.

**MarkdownRenderer module (`renderMarkdown(raw: string): string`)**

Pure function. Uses `marked` with GFM + breaks enabled. No custom renderer — the quote-highlight regex hack that mangles `'...'` and `"..."` into broken `<span class="md-quote-str">` tags is completely removed.

`highlight.js` integrated for fenced code blocks (```). Unlabeled blocks get auto-detected language. Language-labeled blocks (```js, ```python, etc.) get syntax highlighted accordingly.

All output elements wrapped in `.md-render` class for CSS targeting.

**CSS changes:**

Headers all forced to `font-size: 1em`. Distinguished by color and font-weight only:
- h1: bold + accent color
- h2: bold + text-main color
- h3: semibold + accent color
- h4-h6: semibold + text-muted color

New CSS variables added for syntax highlighting, one set per theme:
- `--md-code-bg` — code block background
- `--md-code-keyword` — keywords
- `--md-code-string` — strings
- `--md-code-comment` — comments
- `--md-code-function` — function names

**EditableCell integration:**

Replace the current `marked` instance + custom renderer in `EditableCell` with a call to `renderMarkdown()`. Display mode uses the new renderer output. Edit mode unchanged (contentEditable div).

**Tests:**

- Plain text passes through unchanged
- Bold/italic rendered correctly
- Headers have correct classes and font-size: 1em
- Fenced code block with language → syntax-highlighted HTML with correct token spans
- Fenced code block without language → auto-detected and highlighted
- Inline code wrapped in `<code>` tags
- Quotes (`'hello'` and `"world"`) rendered as plain text — NOT mangled
- Links rendered with `target="_blank"`

## Acceptance criteria

- [ ] Single and double quotes in markdown render as normal text, no HTML artifacts
- [ ] Fenced code blocks (```) render with syntax highlighting
- [ ] Fenced code blocks with language label (```js) get correct language highlighting
- [ ] Inline code renders with `<code>` styling
- [ ] Headers (h1-h6) are all the same font size as body text
- [ ] Headers are visually distinct via color and font-weight
- [ ] Syntax highlighting colors change with the active theme
- [ ] All markdown colors (headers, strong, em, code, blockquote) respond to theme changes
- [ ] Activity cells in both desktop table and mobile accordion render markdown correctly
- [ ] Editing a cell still works (contentEditable), save preserves markdown source
- [ ] All MarkdownRenderer tests pass

## Blocked by

None — can start immediately (no dependency on other slices)
