import mongoose from 'mongoose';

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
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
