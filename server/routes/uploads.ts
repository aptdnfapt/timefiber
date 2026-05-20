import express from 'express';
import crypto from 'crypto';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

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
