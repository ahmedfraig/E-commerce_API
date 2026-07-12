const Joi = require('joi');

exports.createProductSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200).required().messages({
    'string.base': 'Product name must be a string',
    'string.empty': 'Product name cannot be empty',
    'string.min': 'Product name must be at least 3 characters',
    'string.max': 'Product name cannot exceed 200 characters',
    'any.required': 'Product name is required'
  }),
  shortDescription: Joi.string().trim().min(10).max(500).required().messages({
    'string.empty': 'Short description cannot be empty',
    'string.min': 'Short description must be at least 10 characters',
    'string.max': 'Short description cannot exceed 500 characters',
    'any.required': 'Short description is required'
  }),
  description: Joi.string().trim().min(20).required().messages({
    'string.empty': 'Description cannot be empty',
    'string.min': 'Description must be at least 20 characters',
    'any.required': 'Description is required'
  }),
  price: Joi.number().min(0).required().messages({
    'number.min': 'Price cannot be negative',
    'any.required': 'Price is required'
  }),
  discountPrice: Joi.number().min(0).less(Joi.ref('price')).optional().messages({
    'number.min': 'Discount price cannot be negative',
    'number.less': 'Discount price must be strictly less than the regular price'
  }),
  stock: Joi.number().integer().min(0).required().messages({
    'number.integer': 'Stock must be a whole number',
    'number.min': 'Stock cannot be negative',
    'any.required': 'Stock is required'
  }),
  sku: Joi.string().trim().optional(),
  category: Joi.string().trim().required().messages({
    'string.empty': 'Category cannot be empty',
    'any.required': 'Category is required'
  }),
  subcategory: Joi.string().trim().optional(),
  brand: Joi.string().trim().optional(),
  tags: Joi.alternatives().try(
    Joi.string().trim(),
    Joi.array().items(Joi.string().trim())
  ).optional(),
  featured: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  images: Joi.any().optional()
});

exports.updateProductSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200).optional().messages({
    'string.min': 'Product name must be at least 3 characters',
    'string.max': 'Product name cannot exceed 200 characters'
  }),
  shortDescription: Joi.string().trim().min(10).max(500).optional().messages({
    'string.min': 'Short description must be at least 10 characters',
    'string.max': 'Short description cannot exceed 500 characters'
  }),
  description: Joi.string().trim().min(20).optional().messages({
    'string.min': 'Description must be at least 20 characters'
  }),
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
  sku: Joi.string().trim().optional(),
  category: Joi.string().trim().optional(),
  subcategory: Joi.string().trim().optional(),
  brand: Joi.string().trim().optional(),
  tags: Joi.alternatives().try(
    Joi.string().trim(),
    Joi.array().items(Joi.string().trim())
  ).optional(),
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
  comment: Joi.string().trim().min(5).max(1000).required().messages({
    'string.empty': 'Comment cannot be empty',
    'string.min': 'Comment must be at least 5 characters',
    'string.max': 'Comment cannot exceed 1000 characters',
    'any.required': 'Comment is required'
  })
});
