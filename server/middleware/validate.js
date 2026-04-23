import { validationResult } from 'express-validator';

// Shared finalizer for express-validator chains. Route files list the chain
// array first and then this middleware last, e.g. router.post('/x', rules, validate, controller).
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
}
