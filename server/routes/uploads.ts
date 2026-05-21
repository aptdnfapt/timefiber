import express from 'express';
import crypto from 'crypto';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { verifyToken } from '../auth.js';

const router = express.Router();

const UPLOADS_DIR = path.resolve(process.cwd(), '../data/uploads');

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image');
      err.message = 'Only image files are allowed';
      cb(err);
    }
  },
});

router.get('/', verifyToken, (_req, res) => {
  try {
    ensureUploadsDir();
    if (!fs.existsSync(UPLOADS_DIR)) {
      return res.json({ images: [] });
    }
    const files = fs.readdirSync(UPLOADS_DIR);
    const webpFiles = files.filter((f) => f.endsWith('.webp'));
    const images = webpFiles
      .map((f) => {
        const uuid = f.slice(0, -5); // remove .webp
        const fullPath = path.join(UPLOADS_DIR, f);
        const stat = fs.statSync(fullPath);
        return { uuid, url: `/uploads/${uuid}`, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime)
      .map(({ uuid, url }) => ({ uuid, url }));
    res.json({ images });
  } catch {
    res.status(500).json({ error: 'Failed to list images' });
  }
});

router.delete('/:uuid', verifyToken, (req, res) => {
  const { uuid } = req.params;
  // Simple UUID validation (rough)
  if (!uuid || uuid.includes('..') || uuid.includes('/')) {
    return res.status(400).json({ error: 'Invalid uuid' });
  }
  const avifPath = path.join(UPLOADS_DIR, `${uuid}.avif`);
  const webpPath = path.join(UPLOADS_DIR, `${uuid}.webp`);
  const avifExists = fs.existsSync(avifPath);
  const webpExists = fs.existsSync(webpPath);
  if (!avifExists && !webpExists) {
    return res.status(404).json({ error: 'Image not found' });
  }
  try {
    if (avifExists) fs.unlinkSync(avifPath);
    if (webpExists) fs.unlinkSync(webpPath);
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

router.post('/', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const uuid = crypto.randomUUID();
  const avifPath = path.join(UPLOADS_DIR, `${uuid}.avif`);
  const webpPath = path.join(UPLOADS_DIR, `${uuid}.webp`);

  try {
    ensureUploadsDir();

    const pipeline = sharp(req.file.buffer).resize({ width: 1200, withoutEnlargement: true });

    await Promise.all([
      pipeline.clone().avif({ quality: 50 }).toFile(avifPath),
      pipeline.clone().webp({ quality: 80 }).toFile(webpPath),
    ]);

    res.json({ url: `/uploads/${uuid}` });
  } catch (err) {
    console.error('Image processing failed:', err);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

export default router;
