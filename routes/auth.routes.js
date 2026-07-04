const express = require('express');
const {
  registerSendOtp,
  verifyOtp,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { registerSchema, verifyOtpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validation/auth.validation');

const router = express.Router();

router.post('/register/send-otp', validate(registerSchema), registerSendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);
router.post('/login', validate(loginSchema), login);
router.post('/logout', protect, logout);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
