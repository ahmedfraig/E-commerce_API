const express = require('express');
const {
  registerSendOtp,
  verifyOtp,
  login,
  logout,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
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
router.post('/forgot-password/send-otp', validate(forgotPasswordSchema), forgotPasswordSendOtp);
router.post('/forgot-password/verify-otp', validate(resetPasswordSchema), forgotPasswordVerifyOtp);
router.get('/me', protect, getMe);

module.exports = router;
