import mongoose from 'mongoose';

const revokedTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true });

export default mongoose.model('RevokedToken', revokedTokenSchema);
