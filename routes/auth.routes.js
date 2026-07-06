const express = require('express');
const {
  registerSendOtp,
  verifyOtp,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  refreshToken
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { registerSchema, verifyOtpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validation/auth.validation');

const router = express.Router();

router.post('/register/send-otp', validate(registerSchema), registerSendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);
router.post('/login', validate(loginSchema), login);
router.get('/refresh-token', refreshToken);
router.post('/logout', protect, logout);
router.post('/forgot-password/send-otp', validate(forgotPasswordSchema), forgotPassword);
router.post('/forgot-password/verify-otp', validate(resetPasswordSchema), resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
