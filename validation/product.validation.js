const Joi = require('joi');

exports.createProductSchema = Joi.object({
  name: Joi.string().max(200).required().messages({
    'string.max': 'Product name cannot exceed 200 characters',
    'any.required': 'Product name is required'
  }),
  shortDescription: Joi.string().max(500).required().messages({
    'string.max': 'Short description cannot exceed 500 characters',
    'any.required': 'Short description is required'
  }),
  description: Joi.string().required().messages({
    'any.required': 'Description is required'
  }),
  price: Joi.number().min(0).required().messages({
    'number.min': 'Price cannot be negative',
    'any.required': 'Price is required'
  }),
  discountPrice: Joi.number().min(0).optional().messages({
    'number.min': 'Discount price cannot be negative'
  }),
  stock: Joi.number().integer().min(0).required().messages({
    'number.integer': 'Stock must be a whole number',
    'number.min': 'Stock cannot be negative',
    'any.required': 'Stock is required'
  }),
  sku: Joi.string().optional(),
  category: Joi.string().required().messages({
    'any.required': 'Category is required'
  }),
  subcategory: Joi.string().optional(),
  brand: Joi.string().optional(),
  tags: Joi.string().optional(), // Comes as comma-separated string in form-data
  featured: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  images: Joi.any().optional() // Handled by multer
});

exports.updateProductSchema = Joi.object({
  name: Joi.string().max(200).optional().messages({
    'string.max': 'Product name cannot exceed 200 characters'
  }),
  shortDescription: Joi.string().max(500).optional().messages({
    'string.max': 'Short description cannot exceed 500 characters'
  }),
  description: Joi.string().optional(),
  price: Joi.number().min(0).optional().messages({
    'number.min': 'Price cannot be negative'
  }),
  discountPrice: Joi.number().min(0).optional().messages({
    'number.min': 'Discount price cannot be negative'
  }),
  stock: Joi.number().integer().min(0).optional().messages({
    'number.integer': 'Stock must be a whole number',
    'number.min': 'Stock cannot be negative'
  }),
  sku: Joi.string().optional(),
  category: Joi.string().optional(),
  subcategory: Joi.string().optional(),
  brand: Joi.string().optional(),
  tags: Joi.string().optional(),
  featured: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  images: Joi.any().optional(),
  deletedImages: Joi.string().optional() // JSON array as string
});

exports.addReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.integer': 'Rating must be a whole number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
    'any.required': 'Rating is required'
  }),
  comment: Joi.string().min(5).max(1000).required().messages({
    'string.min': 'Comment must be at least 5 characters',
    'string.max': 'Comment cannot exceed 1000 characters',
    'any.required': 'Comment is required'
  })
});
