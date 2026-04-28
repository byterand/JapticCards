import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import Card from '../models/Card.js';
import { verifyToken } from '../middleware/auth.js';
import { uploadsRoot, deleteManagedImage } from '../utils/cardImages.js';
import { HttpError } from '../utils/HttpError.js';
import {
  ALLOWED_IMAGE_MIMES,
  IMAGE_EXT_BY_MIME,
  MAX_IMAGE_BYTES,
  CARD_UPLOADS_URL_PREFIX
} from '../utils/constants.js';

// Anchored to server/uploads/cards regardless of process cwd.
const UPLOAD_DIR = path.join(uploadsRoot(), 'cards');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = IMAGE_EXT_BY_MIME[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
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
  if (!req.file) throw new HttpError(400, 'No image uploaded');
  return res.status(201).json({ url: `${CARD_UPLOADS_URL_PREFIX}${req.file.filename}` });
});

router.delete('/image', verifyToken, async (req, res) => {
  const url = req.body?.url;
  if (typeof url !== 'string' || !url.startsWith(CARD_UPLOADS_URL_PREFIX)) {
    throw new HttpError(400, 'A managed card image url is required');
  }
  const inUse = await Card.exists({ $or: [{ frontImage: url }, { backImage: url }] });
  if (inUse) throw new HttpError(409, 'Image is in use by a card');
  await deleteManagedImage(url);
  return res.json({ message: 'Image deleted' });
});

export default router;
