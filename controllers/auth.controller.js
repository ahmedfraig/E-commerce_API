const User = require('../models/User.model');
const OTP = require('../models/OTP.model');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const { MESSAGES } = require('../utils/constants');
const { sendTokenResponse } = require('../utils/token');



exports.registerSendOtp = async (req, res, next) => {
  try {
    const { email, ...userData } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return next(new AppError(MESSAGES.USER_ALREADY_EXISTS, 400));

    const existingOtp = await OTP.findOne({ email, expiresAt: { $gt: Date.now() } });
    if (existingOtp) return next(new AppError('Otp already exists check your email', 400));

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    await OTP.create({
      email,
      otp: hashedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      userData
    });

    try {
      await sendEmail({
        email,
        subject: 'Your Registration OTP',
        message: `Your OTP is ${otp}. It is valid for 10 minutes.`
      });
    } catch (emailError) {
      await OTP.deleteOne({ email });
      return next(new AppError('Failed to send OTP email, please try again.', 500));
    }

    res.status(200).json({ success: true, message: MESSAGES.OTP_SENT });
  } catch (error) {
    next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    const otpRecord = await OTP.findOne({ email, otp: hashedOtp, expiresAt: { $gt: Date.now() } });
    if (!otpRecord) return next(new AppError(MESSAGES.INVALID_OTP, 400));

    const user = await User.create({
      email,
      isVerified: true,
      ...otpRecord.userData
    });

    await OTP.deleteOne({ _id: otpRecord._id });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return next(new AppError('Please provide email and password', 400));

    const user = await User.findOne({ email }).select('+password');
    if (!user) return next(new AppError(MESSAGES.INVALID_CREDENTIALS, 401));

    if (user.isActive === false) return next(new AppError('Your account has been deactivated', 403));

    if (!user.isVerified) return next(new AppError(MESSAGES.EMAIL_NOT_VERIFIED, 403));

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return next(new AppError(MESSAGES.INVALID_CREDENTIALS, 401));

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return next(new AppError('No refresh token provided', 401));
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.isActive === false) return next(new AppError(MESSAGES.USER_NOT_FOUND, 401));

    sendTokenResponse(user, 200, res);
  } catch (error) {
    return next(new AppError('Invalid or expired refresh token', 401));
  }
};

exports.logout = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  });
  res.status(200).json({ success: true, message: MESSAGES.LOGGED_OUT });
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, isActive: { $ne: false } });
    if (!user) {
      // Intentionally vague to prevent email enumeration
      return res.status(200).json({ success: true, message: MESSAGES.PASSWORD_RESET_SENT });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    await sendEmail({
      email,
      subject: 'Password Reset Link',
      message: `You requested a password reset. Please click on the following link to reset your password: \n\n ${resetUrl}`
    });

    res.status(200).json({ success: true, message: MESSAGES.PASSWORD_RESET_SENT });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return next(new AppError('Token and new password are required', 400));
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) return next(new AppError(MESSAGES.INVALID_RESET_TOKEN, 400));

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
  res.status(200).json({ success: true, data: req.user });
};
exports.changeRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError(MESSAGES.USER_NOT_FOUND, 404));

    if (req.user.id === req.params.id) {
      return next(new AppError(MESSAGES.USER_CANNOT_CHANGE_OWN_ROLE, 400));
    }

    user.role = role;
    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
