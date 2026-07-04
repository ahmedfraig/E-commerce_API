const Joi = require('joi');

exports.registerSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().optional()
});

exports.verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().required()
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

exports.resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).required()
});
