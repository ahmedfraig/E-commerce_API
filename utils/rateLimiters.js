const rateLimit = require('express-rate-limit');

const createLimiter = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message }
  });

const otpLimiter = createLimiter(
  10,
  3,
  'Too many OTP requests from this IP. Please wait 10 minutes before trying again.'
);

const loginLimiter = createLimiter(
  15,
  5,
  'Too many login attempts from this IP. Please wait 15 minutes before trying again.'
);

const resetPasswordLimiter = createLimiter(
  15,
  5,
  'Too many password reset attempts from this IP. Please wait 15 minutes before trying again.'
);

module.exports = { otpLimiter, loginLimiter, resetPasswordLimiter };
