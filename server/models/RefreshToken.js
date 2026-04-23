import mongoose from 'mongoose';

// Stored server-side so refresh tokens can be rotated and revoked cheaply.
// `family` groups a chain of rotated tokens. If any retired token in the
// family is replayed we can revoke the whole family (reuse detection).
const refreshTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true, index: true },
  tokenHash: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  family: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null },
  replacedByJti: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('RefreshToken', refreshTokenSchema);