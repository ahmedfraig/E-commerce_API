const Joi = require('joi');

const PHONE_PATTERN = /^[+]?[\d\s\-()]{7,15}$/;

exports.createOrderSchema = Joi.object({
  shippingAddress: Joi.object({
    fullName: Joi.string().trim().min(2).required().messages({
      'string.min': 'Full name must be at least 2 characters',
      'any.required': 'Full name is required'
    }),
    phone: Joi.string().trim().pattern(PHONE_PATTERN).required().messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'any.required': 'Phone number is required'
    }),
    country: Joi.string().trim().required().messages({
      'any.required': 'Country is required'
    }),
    city: Joi.string().trim().required().messages({
      'any.required': 'City is required'
    }),
    address: Joi.string().trim().required().messages({
      'any.required': 'Address is required'
    }),
    postalCode: Joi.string().trim().allow('').optional().messages({
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
}).options({ stripUnknown: true });

exports.updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')
    .required()
    .messages({
      'any.only': 'Invalid order status provided',
      'any.required': 'Status is required'
    })
}).options({ stripUnknown: true });

exports.orderIdSchema = Joi.object({
  id: Joi.string().trim().hex().length(24).required().messages({
    'string.hex': 'Order ID must only contain hexadecimal characters',
    'string.length': 'Order ID must be exactly 24 characters long',
    'any.required': 'Order ID is required'
  })
}).options({ stripUnknown: true });
