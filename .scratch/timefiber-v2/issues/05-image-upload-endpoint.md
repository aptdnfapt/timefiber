# 05 — Image upload endpoint (sharp)

Status: needs-triage

## Parent

PRD: `.scratch/timefiber-v2/PRD.md`

## What to build

Server-side image upload endpoint that receives images, processes them with `sharp` into optimized AVIF and WebP formats, stores them on disk, and serves them statically.

**Dependencies to add:**
- `sharp` (native image processing)
- `multer` (multipart form parsing for file uploads)

**`POST /api/uploads`:**
- Receives multipart form data with field name `image`
- Validates file is an image MIME type
- Generates unique filename using `crypto.randomUUID()`
- Uses `sharp` to produce two output files:
  - AVIF at quality 50, max 1200px wide → `data/uploads/<uuid>.avif`
  - WebP at quality 80, max 1200px wide → `data/uploads/<uuid>.webp`
- Returns JSON: `{ url: "/uploads/<uuid>" }` — no file extension in URL (client adds `.avif` or `.webp`)
- Creates `data/uploads/` directory on first upload if it doesn't exist

**Static serving:**
- `GET /uploads/*` serves files from `data/uploads/` directory via express.static
- No original files stored — only the two optimized outputs

**Tests:**
- Valid image upload → creates both .avif and .webp files
- Returns correct URL in response
- Invalid file type → rejected with 400
- Missing file field → rejected with 400

## Acceptance criteria

- [ ] `POST /api/uploads` with a valid image returns `{ url: "/uploads/<uuid>" }`
- [ ] Upload creates `<uuid>.avif` and `<uuid>.webp` in `data/uploads/`
- [ ] AVIF file is valid and opens correctly
- [ ] WebP file is valid and opens correctly
- [ ] Both files are no wider than 1200px
- [ ] `GET /uploads/<uuid>.avif` serves the file
- [ ] `GET /uploads/<uuid>.webp` serves the file
- [ ] Non-image upload returns 400
- [ ] Missing file field returns 400
- [ ] Uploads directory auto-created on first upload
- [ ] All tests pass

## Blocked by

None — can start immediately (no dependency on other slices)
