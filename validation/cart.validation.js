const Joi = require('joi');

const productIdField = () => Joi.string().trim().hex().length(24).required().messages({
  'string.hex': 'Product ID must only contain hexadecimal characters',
  'string.length': 'Product ID must be exactly 24 characters long',
  'any.required': 'Product ID is required'
});

const quantityField = () => Joi.number().integer().min(1).required().messages({
  'number.integer': 'Quantity must be a whole number',
  'number.min': 'Quantity must be at least 1',
  'any.required': 'Quantity is required'
});

exports.addItemToCartSchema = Joi.object({
  productId: productIdField(),
  quantity: quantityField()
}).options({ stripUnknown: true });

exports.updateItemQuantitySchema = Joi.object({
  productId: productIdField(),
  quantity: quantityField()
}).options({ stripUnknown: true });

exports.removeItemSchema = Joi.object({
  productId: productIdField()
}).options({ stripUnknown: true });

exports.applyCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().required().messages({
    'any.required': 'Coupon code is required'
  })
}).options({ stripUnknown: true });
