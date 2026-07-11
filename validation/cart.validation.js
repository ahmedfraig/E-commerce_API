const Joi = require('joi');

exports.addItemToCartSchema = Joi.object({
  productId: Joi.string().required().messages({
    'any.required': 'Product ID is required'
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.integer': 'Quantity must be a whole number',
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required'
  })
});

exports.updateItemQuantitySchema = Joi.object({
  productId: Joi.string().required().messages({
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
