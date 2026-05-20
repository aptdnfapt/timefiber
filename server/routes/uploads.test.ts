import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import uploadsRoutes from './uploads.js';

const TEST_UPLOADS_DIR = path.resolve(process.cwd(), '../data/uploads');

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

describe('POST /api/uploads', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use('/api/uploads', uploadsRoutes);
    serveUploadsStatic(app);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_UPLOADS_DIR)) {
      const files = fs.readdirSync(TEST_UPLOADS_DIR);
      for (const f of files) {
        if (f.endsWith('.avif') || f.endsWith('.webp')) {
          fs.unlinkSync(path.join(TEST_UPLOADS_DIR, f));
        }
      }
    }
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
      fs.unlinkSync(path.join(TEST_UPLOADS_DIR, `${uuid}.avif`));
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
});
