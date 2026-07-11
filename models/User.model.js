const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const addressSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  country: String,
  city: String,
  address: String,
  postalCode: String
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  phone: {
    type: String
  },
  avatar: {
    public_id: { type: String, default: null },
    url: { type: String, default: 'https://res.cloudinary.com/demo/image/upload/v1/defaults/default-avatar.png' }
  },
  role: {
    type: String,
    enum: ['admin', 'customer'],
    default: 'customer'
  },
  needsPasswordChange: {
    type: Boolean,
    default: false
  },
  addresses: [addressSchema],
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, { timestamps: true });

// Pre-save hook to hash password
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getSignedAccessToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

userSchema.methods.getSignedRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '30d'
  });
};

// Override toJSON method to hide sensitive data
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpire;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
