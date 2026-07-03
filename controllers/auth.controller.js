const User = require('../models/User.model');
const OTP = require('../models/OTP.model');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  
  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }
  res.status(statusCode)
    .cookie('refreshToken', refreshToken, options)
    .json({ success: true, accessToken, user });
};

exports.registerSendOtp = async (req, res, next) => {
  try {
    const { email, ...userData } = req.body;
    
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Create OTP record
    await OTP.create({
      email,
      otp: hashedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      userData
    });

    // Send email
    await sendEmail({
      email,
      subject: 'Your Registration OTP',
      message: `Your OTP is ${otp}. It is valid for 10 minutes.`
    });

    res.status(200).json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const otpRecord = await OTP.findOne({ email, otp: hashedOtp, expiresAt: { $gt: Date.now() } });
    if (!otpRecord) return res.status(400).json({ message: 'Invalid or expired OTP' });

    // Create user
    const user = await User.create({
      email,
      isVerified: true,
      ...otpRecord.userData
    });

    // Delete OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Please provide email and password' });

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  res.cookie('refreshToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

exports.forgotPasswordSendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    user.resetPasswordToken = hashedOtp;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    await sendEmail({
      email,
      subject: 'Password Reset OTP',
      message: `Your password reset OTP is ${otp}. It is valid for 10 minutes.`
    });

    res.status(200).json({ success: true, message: 'Password reset OTP sent' });
  } catch (error) {
    next(error);
  }
};

exports.forgotPasswordVerifyOtp = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.findOne({
      email,
      resetPasswordToken: hashedOtp,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
