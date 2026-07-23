const Joi = require('joi');

exports.wishlistProductIdSchema = Joi.object({
  productId: Joi.string().trim().hex().length(24).required().messages({
    'string.hex': 'Product ID must only contain hexadecimal characters',
    'string.length': 'Product ID must be exactly 24 characters long',
    'any.required': 'Product ID is required'
  })
}).options({ stripUnknown: true });
