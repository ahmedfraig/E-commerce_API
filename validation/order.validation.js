const Joi = require('joi');

exports.createOrderSchema = Joi.object({
  shippingAddress: Joi.object({
    fullName: Joi.string().required(),
    phone: Joi.string().required(),
    country: Joi.string().required(),
    city: Joi.string().required(),
    address: Joi.string().required(),
    postalCode: Joi.string().required()
  }).required(),
  paymentMethod: Joi.string().valid('cash', 'stripe', 'paypal', 'paymob').optional(),
  customerNote: Joi.string().max(1000).optional()
});

exports.updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned').required()
});
