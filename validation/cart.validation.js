const Joi = require('joi');

exports.addItemToCartSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required()
});

exports.updateItemQuantitySchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required()
});

exports.applyCouponSchema = Joi.object({
  code: Joi.string().required()
});
