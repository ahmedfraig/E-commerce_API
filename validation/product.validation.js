const Joi = require('joi');

exports.createProductSchema = Joi.object({
  name: Joi.string().max(200).required(),
  shortDescription: Joi.string().max(500).required(),
  description: Joi.string().required(),
  price: Joi.number().min(0).required(),
  discountPrice: Joi.number().min(0).optional(),
  stock: Joi.number().min(0).required(),
  sku: Joi.string().optional(),
  category: Joi.string().required(),
  subcategory: Joi.string().optional(),
  brand: Joi.string().optional(),
  tags: Joi.string().optional(), // Tags come as a comma-separated string in form-data
  featured: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  images: Joi.any().optional() // Handled by multer
});

exports.updateProductSchema = Joi.object({
  name: Joi.string().max(200).optional(),
  shortDescription: Joi.string().max(500).optional(),
  description: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
  discountPrice: Joi.number().min(0).optional(),
  stock: Joi.number().min(0).optional(),
  sku: Joi.string().optional(),
  category: Joi.string().optional(),
  subcategory: Joi.string().optional(),
  brand: Joi.string().optional(),
  tags: Joi.string().optional(),
  featured: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  images: Joi.any().optional(), // Handled by multer
  deletedImages: Joi.string().optional() // JSON array as string
});

exports.addReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().required()
});
