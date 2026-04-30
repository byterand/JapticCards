import mongoose from 'mongoose';
import { AUTH_LIMITS } from '../utils/limits.js';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: AUTH_LIMITS.USERNAME_MIN,
    maxLength: AUTH_LIMITS.USERNAME_MAX,
    match: /^[a-z0-9_]+$/
  },
  password: {
    type: String,
    required: true
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
