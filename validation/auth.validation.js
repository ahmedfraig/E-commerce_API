const Joi = require('joi');

// Reusable patterns
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const PHONE_PATTERN = /^[+]?[\d\s\-()]{7,15}$/;

const passwordField = (required = true) => {
  const base = Joi.string()
    .min(8)
    .pattern(PASSWORD_PATTERN)
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    });
  return required ? base.required() : base.optional();
};

const emailField = (required = true) => {
  const base = Joi.string().email().lowercase().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  });
  return required ? base.required() : base.optional();
};

const phoneField = () => Joi.string().pattern(PHONE_PATTERN).optional().messages({
  'string.pattern.base': 'Please provide a valid phone number'
});

exports.registerSchema = Joi.object({
  username: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Username must be at least 2 characters',
    'string.max': 'Username cannot exceed 50 characters',
    'any.required': 'Username is required'
  }),
  email: emailField(),
  password: passwordField(),
  phone: phoneField()
});

exports.verifyOtpSchema = Joi.object({
  email: emailField(),
  otp: Joi.string().length(6).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'any.required': 'OTP is required'
  })
});

exports.loginSchema = Joi.object({
  email: emailField(),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

exports.forgotPasswordSchema = Joi.object({
  email: emailField()
});

exports.resetPasswordSchema = Joi.object({
  otp: Joi.string().required().messages({
    'any.required': 'Reset token is required'
  }),
  newPassword: passwordField()
});

exports.changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: passwordField()
});

exports.addUserSchema = Joi.object({
  username: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Username must be at least 2 characters',
    'any.required': 'Username is required'
  }),
  email: emailField(),
  password: passwordField(),
  phone: phoneField(),
  role: Joi.string().valid('admin', 'customer').optional().messages({
    'any.only': 'Role must be either admin or customer'
  }),
  avatar: Joi.any().optional()
});

exports.updateUserSchema = Joi.object({
  username: Joi.string().min(2).max(50).optional(),
  email: emailField(false),
  phone: phoneField(),
  avatar: Joi.any().optional(),
  addresses: Joi.any().optional()
});

exports.changeRoleSchema = Joi.object({
  role: Joi.string().valid('admin', 'customer').required().messages({
    'any.only': 'Role must be either admin or customer',
    'any.required': 'Role is required'
  })
});
