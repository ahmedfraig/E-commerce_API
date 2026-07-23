const rateLimit = require('express-rate-limit');

// Helper to create a standardized limiter with a clean JSON response
const createLimiter = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message }
  });

// For OTP sending endpoints: register & forgot-password => 3 requests per 10 minutes per IP
const otpLimiter = createLimiter(
  10,
  3,
  'Too many OTP requests from this IP. Please wait 10 minutes before trying again.'
);

// For login endpoint: 5 attempts per 15 minutes per IP
const loginLimiter = createLimiter(
  15,
  5,
  'Too many login attempts from this IP. Please wait 15 minutes before trying again.'
);

// For password reset verification: 5 attempts per 15 minutes per IP
const resetPasswordLimiter = createLimiter(
  15,
  5,
  'Too many password reset attempts from this IP. Please wait 15 minutes before trying again.'
);

module.exports = { otpLimiter, loginLimiter, resetPasswordLimiter };
