const Joi = require('joi');
const { passwordField, emailField, phoneField } = require('./auth.validation');

exports.addUserSchema = Joi.object({
  username: Joi.string().trim().min(2).max(50).required().messages({
    'string.min': 'Username must be at least 2 characters',
    'string.max': 'Username cannot exceed 50 characters',
    'any.required': 'Username is required'
  }),
  email: emailField(),
  password: passwordField(),
  phone: phoneField(),
  role: Joi.string().valid('admin', 'customer').optional().messages({
    'any.only': 'Role must be either admin or customer'
  }),
  avatar: Joi.any().optional()
}).options({ stripUnknown: true });

exports.updateUserSchema = Joi.object({
  username: Joi.string().trim().min(2).max(50).optional().messages({
    'string.min': 'Username must be at least 2 characters',
    'string.max': 'Username cannot exceed 50 characters'
  }),
  email: emailField(false),
  phone: phoneField(),
  avatar: Joi.any().optional(),
  addresses: Joi.array().items(
    Joi.object({
      fullName: Joi.string().trim().required().messages({ 'any.required': 'Full name is required for address' }),
      phone: Joi.string().trim().required().messages({ 'any.required': 'Phone is required for address' }),
      country: Joi.string().trim().required().messages({ 'any.required': 'Country is required for address' }),
      city: Joi.string().trim().required().messages({ 'any.required': 'City is required for address' }),
      address: Joi.string().trim().required().messages({ 'any.required': 'Address is required' }),
      postalCode: Joi.string().trim().allow('').optional()
    })
  ).optional()
}).min(1).options({ stripUnknown: true });

exports.changeRoleSchema = Joi.object({
  role: Joi.string().valid('admin', 'customer').required().messages({
    'any.only': 'Role must be either admin or customer',
    'any.required': 'Role is required'
  })
}).options({ stripUnknown: true });

exports.userIdSchema = Joi.object({
  id: Joi.string().trim().hex().length(24).required().messages({
    'string.hex': 'User ID must only contain hexadecimal characters',
    'string.length': 'User ID must be exactly 24 characters long',
    'any.required': 'User ID is required'
  })
}).options({ stripUnknown: true });
