const Joi = require('joi');

const PHONE_PATTERN = /^[+]?[\d\s\-()]{7,15}$/;

exports.createOrderSchema = Joi.object({
  shippingAddress: Joi.object({
    fullName: Joi.string().min(2).required().messages({
      'string.min': 'Full name must be at least 2 characters',
      'any.required': 'Full name is required'
    }),
    phone: Joi.string().pattern(PHONE_PATTERN).required().messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'any.required': 'Phone number is required'
    }),
    country: Joi.string().required().messages({
      'any.required': 'Country is required'
    }),
    city: Joi.string().required().messages({
      'any.required': 'City is required'
    }),
    address: Joi.string().required().messages({
      'any.required': 'Address is required'
    }),
    postalCode: Joi.string().required().messages({
      'any.required': 'Postal code is required'
    })
  }).required().messages({
    'any.required': 'Shipping address is required'
  }),
  paymentMethod: Joi.string().valid('cash', 'stripe', 'paypal', 'paymob').optional().messages({
    'any.only': 'Payment method must be one of: cash, stripe, paypal, paymob'
  }),
  customerNote: Joi.string().max(1000).optional().messages({
    'string.max': 'Note cannot exceed 1000 characters'
  })
});

exports.updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')
    .required()
    .messages({
      'any.only': 'Invalid order status provided',
      'any.required': 'Status is required'
    })
});
