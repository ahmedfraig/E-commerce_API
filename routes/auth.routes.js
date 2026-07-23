const express = require('express');
const {
  registerSendOtp,
  verifyOtp,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  refreshToken,
  changeRole
} = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { registerSchema, verifyOtpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validation/auth.validation');
const { changeRoleSchema } = require('../validation/user.validation');
const { otpLimiter, loginLimiter, resetPasswordLimiter } = require('../utils/rateLimiters');

const router = express.Router();

router.post('/register/send-otp', otpLimiter, validate(registerSchema), registerSendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.get('/refresh-token', refreshToken);
router.post('/logout', protect, logout);
router.post('/forgot-password/send-otp', otpLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/forgot-password/verify-otp', resetPasswordLimiter, validate(resetPasswordSchema), resetPassword);
router.get('/me', protect, getMe);
router.patch('/change-role/:id', protect, authorize('admin'), validate(changeRoleSchema), changeRole);

module.exports = router;
