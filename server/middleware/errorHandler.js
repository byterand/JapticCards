import mongoose from 'mongoose';
import { HttpError } from '../utils/HttpError.js';

// Centralized error middleware. Services throw HttpError for client-facing
// failures; anything else is treated as an unexpected server error.
export function errorHandler(err, req, res, _) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}