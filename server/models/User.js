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
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student',
    index: true
  }
}, { timestamps: true });

// Cascade delete any RefreshToken docs belonging to a user when the user is removed
async function cleanupRefreshTokensForUserIds(ids) {
  if (!ids || ids.length === 0) return;
  const RefreshToken = mongoose.model('RefreshToken');
  await RefreshToken.deleteMany({ userId: { $in: ids } });
}

userSchema.pre('deleteOne', { document: true, query: false }, async function () {
  await cleanupRefreshTokensForUserIds([this._id]);
});

userSchema.pre('findOneAndDelete', async function () {
  const doc = await this.model.findOne(this.getFilter()).select('_id');
  if (doc) await cleanupRefreshTokensForUserIds([doc._id]);
});

userSchema.pre('deleteMany', async function () {
  const docs = await this.model.find(this.getFilter()).select('_id');
  await cleanupRefreshTokensForUserIds(docs.map((d) => d._id));
});

export default mongoose.model('User', userSchema);
