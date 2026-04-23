import { HttpError } from '../utils/HttpError.js';

// Centralized error middleware. Services throw HttpError for client-facing
// failures; anything else is treated as an unexpected server error.
export function errorHandler(err, req, res, _) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}