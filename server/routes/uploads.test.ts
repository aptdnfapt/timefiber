import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import jwt from 'jsonwebtoken';
import uploadsRoutes from './uploads.js';

const TEST_UPLOADS_DIR = path.resolve(process.cwd(), '../data/uploads');

function getJwt(): string {
  const secret = process.env.JWT_SECRET || 'dev-secret-key';
  return jwt.sign({ authenticated: true }, secret);
}

function authHeader(): Record<string, string> {
  return { Authorization: `Bearer ${getJwt()}` };
}

async function createTestImageBuffer(): Promise<Buffer> {
  return sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  }).png().toBuffer();
}

function serveUploadsStatic(app: express.Express) {
  app.use('/uploads', express.static(TEST_UPLOADS_DIR));
}

function randomPort(): number {
  return 21000 + Math.floor(Math.random() * 5000);
}

function cleanupUploadsDir() {
  if (fs.existsSync(TEST_UPLOADS_DIR)) {
    const files = fs.readdirSync(TEST_UPLOADS_DIR);
    for (const f of files) {
      if (f.endsWith('.avif') || f.endsWith('.webp')) {
        try { fs.unlinkSync(path.join(TEST_UPLOADS_DIR, f)); } catch { /* ignore */ }
      }
    }
  }
}

describe('uploads endpoints', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use('/api/uploads', uploadsRoutes);
    serveUploadsStatic(app);
  });

  beforeEach(() => {
    cleanupUploadsDir();
  });

  afterAll(() => {
    cleanupUploadsDir();
  });

  it('uploads a valid image and creates avif + webp files', async () => {
    const form = new FormData();
    const buf = await createTestImageBuffer();
    const blob = new Blob([buf], { type: 'image/png' });
    form.append('image', blob, 'test.png');

    const port = randomPort();
    const server = app.listen(port);

    try {
      const res = await fetch(`http://localhost:${port}/api/uploads`, {
        method: 'POST',
        body: form,
      });

      expect(res.status).toBe(200);
      const body = await res.json() as { url: string };
      expect(body.url).toMatch(/^\/uploads\//);

      const uuid = body.url.replace('/uploads/', '');
      const avifPath = path.join(TEST_UPLOADS_DIR, `${uuid}.avif`);
      const webpPath = path.join(TEST_UPLOADS_DIR, `${uuid}.webp`);

      expect(fs.existsSync(avifPath)).toBe(true);
      expect(fs.existsSync(webpPath)).toBe(true);

      const avifMeta = await sharp(avifPath).metadata();
      const webpMeta = await sharp(webpPath).metadata();

      expect(avifMeta.width).toBeLessThanOrEqual(1200);
      expect(webpMeta.width).toBeLessThanOrEqual(1200);
      expect(avifMeta.format).toBe('heif');
      expect(webpMeta.format).toBe('webp');
    } finally {
      server.close();
    }
  });

  it('serves uploaded files via GET /uploads/', async () => {
    const uuid = 'test-serve-' + Date.now();
    const buf = await createTestImageBuffer();
    const avifBuf = await sharp(buf).avif({ quality: 50 }).toBuffer();
    fs.writeFileSync(path.join(TEST_UPLOADS_DIR, `${uuid}.avif`), avifBuf);

    const port = randomPort();
    const server = app.listen(port);

    try {
      const res = await fetch(`http://localhost:${port}/uploads/${uuid}.avif`);
      expect(res.status).toBe(200);
      const body = await res.arrayBuffer();
      expect(body.byteLength).toBeGreaterThan(0);
    } finally {
      server.close();
      try { fs.unlinkSync(path.join(TEST_UPLOADS_DIR, `${uuid}.avif`)); } catch { /* ignore */ }
    }
  });

  it('rejects non-image file with 400', async () => {
    const form = new FormData();
    const blob = new Blob(['not an image'], { type: 'text/plain' });
    form.append('image', blob, 'test.txt');

    const port = randomPort();
    const server = app.listen(port);

    try {
      const res = await fetch(`http://localhost:${port}/api/uploads`, {
        method: 'POST',
        body: form,
      });
      expect(res.status).toBe(400);
    } finally {
      server.close();
    }
  });

  it('rejects missing file field with 400', async () => {
    const form = new FormData();
    const blob = new Blob(['data'], { type: 'image/png' });
    form.append('notimage', blob, 'test.png');

    const port = randomPort();
    const server = app.listen(port);

    try {
      const res = await fetch(`http://localhost:${port}/api/uploads`, {
        method: 'POST',
        body: form,
      });
      expect(res.status).toBe(400);
    } finally {
      server.close();
    }
  });

  it('GET returns empty array when no images exist', async () => {
    const port = randomPort();
    const server = app.listen(port);

    try {
      const res = await fetch(`http://localhost:${port}/api/uploads`, {
        headers: authHeader(),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { images: unknown[] };
      expect(body.images).toEqual([]);
    } finally {
      server.close();
    }
  });

  it('GET returns list of uploaded images sorted newest first', async () => {
    const uuid1 = 'test-get-' + Date.now() + '-1';
    const uuid2 = 'test-get-' + Date.now() + '-2';
    const buf = await createTestImageBuffer();
    const webpBuf = await sharp(buf).webp({ quality: 80 }).toBuffer();

    fs.writeFileSync(path.join(TEST_UPLOADS_DIR, `${uuid1}.webp`), webpBuf);
    await new Promise((r) => setTimeout(r, 50));
    fs.writeFileSync(path.join(TEST_UPLOADS_DIR, `${uuid2}.webp`), webpBuf);

    const port = randomPort();
    const server = app.listen(port);

    try {
      const res = await fetch(`http://localhost:${port}/api/uploads`, {
        headers: authHeader(),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { images: { uuid: string; url: string }[] };
      const uuids = body.images.map((i) => i.uuid);
      expect(uuids[0]).toBe(uuid2);
      expect(uuids[1]).toBe(uuid1);
      expect(body.images[0].url).toMatch(new RegExp(`^/uploads/${uuid2}$`));
    } finally {
      server.close();
    }
  });

  it('GET requires auth token', async () => {
    const port = randomPort();
    const server = app.listen(port);

    try {
      const res = await fetch(`http://localhost:${port}/api/uploads`);
      expect(res.status).toBe(401);
    } finally {
      server.close();
    }
  });

  it('DELETE removes both .avif and .webp files', async () => {
    const uuid = 'test-delete-both-' + Date.now();
    const buf = await createTestImageBuffer();
    const avifBuf = await sharp(buf).avif({ quality: 50 }).toBuffer();
    const webpBuf = await sharp(buf).webp({ quality: 80 }).toBuffer();

    fs.writeFileSync(path.join(TEST_UPLOADS_DIR, `${uuid}.avif`), avifBuf);
    fs.writeFileSync(path.join(TEST_UPLOADS_DIR, `${uuid}.webp`), webpBuf);

    const port = randomPort();
    const server = app.listen(port);

    try {
      const res = await fetch(`http://localhost:${port}/api/uploads/${uuid}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { deleted: boolean };
      expect(body.deleted).toBe(true);
      expect(fs.existsSync(path.join(TEST_UPLOADS_DIR, `${uuid}.avif`))).toBe(false);
      expect(fs.existsSync(path.join(TEST_UPLOADS_DIR, `${uuid}.webp`))).toBe(false);
    } finally {
      server.close();
    }
  });

  it('DELETE returns 404 for non-existent uuid', async () => {
    const port = randomPort();
    const server = app.listen(port);

    try {
      const res = await fetch(`http://localhost:${port}/api/uploads/nonexistent-uuid`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      expect(res.status).toBe(404);
    } finally {
      server.close();
    }
  });

  it('DELETE requires auth token', async () => {
    const port = randomPort();
    const server = app.listen(port);

    try {
      const res = await fetch(`http://localhost:${port}/api/uploads/some-uuid`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(401);
    } finally {
      server.close();
    }
  });
});
