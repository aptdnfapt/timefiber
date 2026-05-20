# 06 — Image paste/drag/picker + lightbox in activity cell

Status: needs-triage

## Parent

PRD: `.scratch/timefiber-v2/PRD.md`

## What to build

Add image support to the activity cell in `EditableCell`: clipboard paste, drag-and-drop, and a file-picker button for inserting images. Uploads go through the `/api/uploads` endpoint. Displayed inline as thumbnails, click to open full-size in a lightbox overlay.

**EditableCell — edit mode additions:**

Paste handler: on paste event, check `clipboardData.items` for image MIME types. If found → upload the image blob to `/api/uploads` → insert `![](url)` markdown at cursor position.

Drag-drop handler: on drop event, check `dataTransfer.files` for image files → upload each → insert `![](url)` markdown at drop position.

File-picker: a small icon button appears at bottom-right of the cell when in editing mode. Click opens `<input type="file" accept="image/*">`. On file selected → upload → insert `![](url)`.

All uploads use the same client-side upload function that POSTs to `/api/uploads`.

**EditableCell — display mode additions:**

After markdown is rendered via MarkdownRenderer, all `<img>` tags (from `![](url)` markdown) are styled as inline thumbnails:
- `max-width: 200px`, `max-height: 150px`
- `border-radius: 4px`
- `cursor: pointer`
- Click handler opens ImageLightbox

Images use `<picture>` tag with AVIF source + WebP fallback for browser compatibility.

**ImageLightbox component:**
- Full-screen overlay with backdrop
- Image displayed at natural size, capped at 90vw × 90vh
- Close on Escape, click-outside, or X button
- Always loads the AVIF version of the image

## Acceptance criteria

- [ ] Pasting an image from clipboard into an editing activity cell uploads it and inserts `![](url)`
- [ ] Dragging and dropping an image file onto an editing activity cell uploads it and inserts `![](url)`
- [ ] A file-picker icon appears at bottom-right of cell in editing mode
- [ ] Clicking file-picker icon opens OS file browser, selecting an image uploads and inserts `![](url)`
- [ ] Uploaded images appear as small inline thumbnails (max 200×150px) in the rendered activity text
- [ ] Thumbnails have a pointer cursor indicating they are clickable
- [ ] Clicking a thumbnail opens the ImageLightbox overlay
- [ ] ImageLightbox shows the image at full size (capped to 90vw × 90vh)
- [ ] ImageLightbox closes on Escape
- [ ] ImageLightbox closes on click-outside
- [ ] ImageLightbox closes on X button
- [ ] Inline images use `<picture>` with AVIF source + WebP fallback
- [ ] Images persist correctly in the markdown text (saved as `![](/uploads/<uuid>)`)
- [ ] Works on both desktop table view and mobile accordion view

## Blocked by

- #04 — MarkdownRenderer rewrite + EditableCell integration (needs the new EditableCell structure)
- #05 — Image upload endpoint (needs `/api/uploads` to exist)
