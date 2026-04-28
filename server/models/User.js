import mongoose from 'mongoose';
import { USER_ROLES, USER_ROLE_VALUES } from '../utils/constants.js';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 3,
    maxLength: 20,
    match: /^[a-z0-9_]+$/
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: USER_ROLE_VALUES,
    default: USER_ROLES.STUDENT,
    index: true
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
