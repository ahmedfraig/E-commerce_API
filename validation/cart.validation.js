const Joi = require('joi');

exports.addItemToCartSchema = Joi.object({
  productId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Product ID must be a valid MongoDB ObjectId',
    'any.required': 'Product ID is required'
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.integer': 'Quantity must be a whole number',
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required'
  })
});

exports.updateItemQuantitySchema = Joi.object({
  productId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Product ID must be a valid MongoDB ObjectId',
    'any.required': 'Product ID is required'
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.integer': 'Quantity must be a whole number',
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required'
  })
});

exports.applyCouponSchema = Joi.object({
  code: Joi.string().uppercase().required().messages({
    'any.required': 'Coupon code is required'
  })
});
