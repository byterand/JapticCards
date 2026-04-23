import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { verifyToken } from '../middleware/auth.js';
import { uploadsRoot } from '../utils/cardImages.js';
import { HttpError } from '../utils/HttpError.js';

// Anchored to server/uploads/cards regardless of process cwd.
const UPLOAD_DIR = path.join(uploadsRoot(), 'cards');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const EXT_BY_MIME = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = EXT_BY_MIME[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new HttpError(400, 'Unsupported image type'));
    }
    cb(null, true);
  }
});

function handleMulter(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof HttpError) return next(err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new HttpError(413, 'Image exceeds 5 MB limit'));
    }
    return next(new HttpError(400, err.message || 'Upload failed'));
  });
}

const router = Router();

router.post('/image', verifyToken, handleMulter, (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
  return res.status(201).json({ url: `/uploads/cards/${req.file.filename}` });
});

export default router;
