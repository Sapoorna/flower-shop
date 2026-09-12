const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const schema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, default: '', trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    phone: { type: String, default: '', maxlength: 25 },
    googleId: { type: String, sparse: true, unique: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    tokenVersion: { type: Number, default: 0 },
    resetHash: { type: String, select: false },
    resetExpires: { type: Date, select: false },
    lastLogin: Date
  },
  { timestamps: true }
);
schema.pre('save', async function () {
  if (this.isModified('password') && this.password)
    this.password = await bcrypt.hash(this.password, 12);
});
schema.methods.comparePassword = async function (value) {
  return Boolean(this.password) && bcrypt.compare(value, this.password);
};
schema.methods.toJSON = function () {
  return {
    _id: this.id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    phone: this.phone,
    createdAt: this.createdAt
  };
};
module.exports = mongoose.model('User', schema);
