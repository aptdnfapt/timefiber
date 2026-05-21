# 08 — Image gallery, upload modal, cursor fix, settings redesign

Status: needs-triage

## Parent

PRD: `.scratch/timefiber-v2/PRD.md`

## What to build

### Fix: Cursor position loss on image insert

**Problem:** `insertTextAtCursor` uses `window.getSelection()` after the async upload completes. By that time, focus may have shifted (file dialog, user click), so the image lands at position 0 instead of where the cursor was.

**Fix:** Before any image insert flow starts (paste, drop, gallery pick, file upload), save the current `Range` from `window.getSelection()` inside the contentEditable div. After the async upload/gallery-select completes, restore that exact range and insert at it. If restoration fails (div lost focus), fall back to appending `![](url)` at the end of the cell content instead of the start.

### Feature: Image gallery/upload modal for cell insert

**What it is:** Clicking the image attach button on a cell opens a floating modal (not just a file dialog). The modal has two horizontal tabs at the top and an image grid below.

**Layout:**

```
┌─────────────────────────────┬────────────────────────────┐
│         Gallery             │          Upload            │
├─────────────────────────────┴────────────────────────────┤
│                                                          │
│   [img] [img] [img] [img] [img]                         │
│   [img] [img] [img] [img] [img]                         │
│   [img] [img] [img] [img] [img]                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Tab 1 — Gallery:**
- Grid of all uploaded images (thumbnail view, WebP version)
- Fetched from `GET /api/uploads`
- Click any image → inserts `![](url)` at the saved cursor position in the calling cell → closes modal
- Empty state: "No images uploaded yet" message

**Tab 2 — Upload:**
- Drag-and-drop zone in the center ("Drop image here or click to browse")
- File picker button in center of drop zone
- Uploads through the same `/api/uploads` endpoint
- After upload completes → switches to Gallery tab showing the new image
- Loading spinner during upload

**Behavior:** On opening the modal, the cell's current cursor position/range is saved. On selecting (gallery) or uploading (upload tab), the image markdown inserts at that saved position. The cell stays in edit mode behind the modal — only markdown text changes.

### Feature: Settings modal redesign with sidebar tabs

**What it is:** Settings modal becomes a wider, two-column layout with a left sidebar for navigation and a right content area.

**Layout:**

```
┌───────────┬──────────────────────────────────────────┐
│  General  │                                          │
│           │   (current settings content:             │
│  Gallery  │    theme picker + auto-lock dropdown)    │
│           │                                          │
│           │                                          │
│           │                                          │
└───────────┴──────────────────────────────────────────┘
```

**Sidebar (left):** Vertical list of nav items — "General", "Gallery", and future ones. Active item highlighted. Clicking switches the right content area.

**General tab (right):** Current settings content — theme picker + auto-lock dropdown. Unchanged.

**Gallery tab (right):** Full image management page. Grid of all uploaded images with:
- Thumbnail preview (WebP)
- File name/UUID below each
- Delete button (X icon) on each image
- Delete shows confirmation dialog. Before deleting, scans all entries' `activity` column for `![](/uploads/<uuid>)` references. If found → warn "This image is used in N entries" with entry count. User can still proceed or cancel.
- Empty state: "No images uploaded yet"

### Server: List + Delete endpoints

**`GET /api/uploads`** (auth-protected):
- Scans `data/uploads/` directory for all `.webp` files
- Returns `{ images: [{ uuid: string, url: string }] }` sorted by file modification time (newest first)
- `url` is `/uploads/<uuid>` (no extension — client adds `.avif` / `.webp`)

**`DELETE /api/uploads/:uuid`** (auth-protected):
- Deletes both `<uuid>.avif` and `<uuid>.webp` from `data/uploads/`
- Returns `{ deleted: true }`
- 404 if files don't exist
- No automatic cleanup of entries referencing deleted images (handled by client-side warning before calling this)

### Client: API additions

Add to `api.ts`:
- `getImages()` → `GET /api/uploads` → `Promise<{ images: { uuid: string, url: string }[] }>`
- `deleteImage(uuid)` → `DELETE /api/uploads/:uuid` → `Promise<void>`

## Acceptance criteria

### Cursor fix
- [ ] Pasting an image inserts `![](url)` at the cursor position (not at start)
- [ ] Dropping an image inserts `![](url)` at the cursor position
- [ ] Selecting from gallery inserts `![](url)` at the cursor position
- [ ] Uploading via gallery upload tab inserts `![](url)` at the cursor position
- [ ] If cursor position is lost, markdown appends to end of cell (not start)

### Image gallery/upload modal (cell)
- [ ] Clicking image attach button on cell opens the modal, not a file dialog
- [ ] Modal has two tabs: Gallery and Upload
- [ ] Gallery tab shows grid of all previously uploaded images
- [ ] Clicking an image in Gallery inserts `![](url)` at cursor and closes modal
- [ ] Upload tab has drag-drop zone and file picker button
- [ ] Dragging an image onto the upload tab uploads it, then switches to Gallery
- [ ] Clicking file picker in upload tab uploads selected image, then switches to Gallery
- [ ] Upload tab shows loading spinner during upload
- [ ] Gallery shows "No images uploaded yet" when empty
- [ ] Modal closes on Escape, click-outside, X button

### Settings modal redesign
- [ ] Settings modal has left sidebar with "General" and "Gallery" nav items
- [ ] Modal is wider than before to accommodate the sidebar layout
- [ ] Clicking sidebar item switches the right content area
- [ ] Active sidebar item is visually highlighted
- [ ] General tab shows current settings (theme picker + auto-lock dropdown), unchanged
- [ ] Gallery tab shows image grid with thumbnails
- [ ] Each image has a delete button (X icon)
- [ ] Clicking delete shows confirmation dialog
- [ ] If entry references exist, dialog warns "Used in N entries"
- [ ] User can still proceed with delete after warning
- [ ] Delete removes both .avif and .webp from server
- [ ] Grid updates after delete
- [ ] Gallery tab shows "No images uploaded yet" when empty

### Server endpoints
- [ ] `GET /api/uploads` returns list of all uploaded images, newest first
- [ ] `GET /api/uploads` returns empty array when no images exist
- [ ] `GET /api/uploads` requires auth token
- [ ] `DELETE /api/uploads/:uuid` deletes both .avif and .webp files
- [ ] `DELETE /api/uploads/:uuid` returns 404 for non-existent UUID
- [ ] `DELETE /api/uploads/:uuid` requires auth token

## Blocked by

None — can start immediately. Depends on the existing upload infrastructure from v2.
