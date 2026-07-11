const Product = require('../models/Product.model');
const Order = require('../models/Order.model');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const AppError = require('../utils/AppError');
const { MESSAGES } = require('../utils/constants');

// Helper to upload images to Cloudinary (Transactional with Rollback)
const uploadImages = async (files) => {
  const uploadPromises = files.map(file => {
    return cloudinary.uploader.upload(file.path, {
      folder: 'ecommerce/products'
    }).then(result => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return { public_id: result.public_id, url: result.secure_url };
    }).catch(error => {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw error;
    });
  });

  const results = await Promise.allSettled(uploadPromises);

  const successfulUploads = [];
  const failedUploads = [];

  results.forEach(result => {
    if (result.status === 'fulfilled') {
      successfulUploads.push(result.value);
    } else {
      failedUploads.push(result.reason);
    }
  });

  if (failedUploads.length > 0) {
    if (successfulUploads.length > 0) {
      await Promise.allSettled(
        successfulUploads.map(img => cloudinary.uploader.destroy(img.public_id))
      );
    }
    throw new AppError(MESSAGES.PRODUCT_IMAGE_UPLOAD_FAILED, 500);
  }

  return successfulUploads;
};

// @desc    Get all active products
// @route   GET /products
exports.getProducts = async (req, res, next) => {
  try {
    const { category, brand, minPrice, maxPrice, sort, featured, page: pageQuery = 1, limit: limitQuery = 10 } = req.query;
    const page = parseInt(pageQuery, 10);
    const limit = Math.min(parseInt(limitQuery, 10) || 10, 100);
    let query = { isActive: true };

    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (featured === 'true') query.featured = true;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    let queryBuilder = Product.find(query).select('-reviews');

    if (sort) {
      const sortBy = sort.split(',').join(' ');
      queryBuilder = queryBuilder.sort(sortBy);
    } else {
      queryBuilder = queryBuilder.sort('-createdAt');
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      queryBuilder.skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(query)
    ]);

    res.status(200).json({ success: true, count: products.length, total, data: products });
  } catch (error) {
    next(error);
  }
};

// @desc    Search products
// @route   GET /products/search
exports.searchProducts = async (req, res, next) => {
  try {
    const { text, category, subcategory, brand, tags, minPrice, maxPrice, sort, page: pageQuery = 1, limit: limitQuery = 10 } = req.query;
    const page = parseInt(pageQuery, 10);
    const limit = Math.min(parseInt(limitQuery, 10) || 10, 100);
    let query = { isActive: true };

    if (text) query.$text = { $search: text };
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (brand) query.brand = brand;
    if (tags) query.tags = { $in: tags.split(',') };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    let queryBuilder = Product.find(query).select('-reviews');
    if (sort) {
      queryBuilder = queryBuilder.sort(sort.split(',').join(' '));
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      queryBuilder.skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(query)
    ]);

    res.status(200).json({ success: true, count: products.length, total, data: products });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /products/:id
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!product) return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /products
exports.createProduct = async (req, res, next) => {
  try {
    req.body.createdBy = req.user.id;

    const product = new Product(req.body);
    const validationError = product.validateSync({ pathsToSkip: ['images'] });
    if (validationError) return next(validationError);

    if (req.files && req.files.length > 0) {
      product.images = await uploadImages(req.files);
    }

    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }
    next(error);
  }
};


// @desc    Update product
// @route   PUT /products/update/:id
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);
    if (!product) {
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
      }
      return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
    }

    const { name, shortDescription, description, price, discountPrice, stock, category, brand, isActive } = req.body;

    if (name) product.name = name;
    if (shortDescription) product.shortDescription = shortDescription;
    if (description) product.description = description;
    if (price) product.price = price;
    if (discountPrice !== undefined) product.discountPrice = discountPrice;
    if (stock !== undefined) product.stock = stock;
    if (category) product.category = category;
    if (brand) product.brand = brand;
    if (isActive !== undefined) product.isActive = isActive;

    await product.validate();

    let newImages = [];
    if (req.files && req.files.length > 0) {
      newImages = await uploadImages(req.files);
    }

    if (req.body.deletedImages) {
      const deletedImages = JSON.parse(req.body.deletedImages);
      const productPublicIds = product.images.map(img => img.public_id);
      const validDeletedImages = deletedImages.filter(id => productPublicIds.includes(id));

      if (validDeletedImages.length > 0) {
        await Promise.allSettled(validDeletedImages.map(public_id => cloudinary.uploader.destroy(public_id)));
        product.images = product.images.filter(img => !validDeletedImages.includes(img.public_id));
      }
    }

    if (newImages.length > 0) {
      product.images.push(...newImages);
    }

    await product.save();
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
    }
    next(error);
  }
};

// @desc    Delete product (Soft Delete)
// @route   DELETE /products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));

    product.isActive = false;
    await product.save();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Add review
// @route   POST /products/:id/reviews
exports.addReview = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));

    if (!product.isActive) return next(new AppError(MESSAGES.PRODUCT_INACTIVE, 400));

    const hasBought = await Order.findOne({
      user: req.user.id,
      status: 'delivered',
      'items.product': product._id
    });

    if (!hasBought) return next(new AppError(MESSAGES.PRODUCT_REVIEW_PURCHASE_REQUIRED, 403));

    const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user.id.toString());
    if (alreadyReviewed) return next(new AppError(MESSAGES.PRODUCT_ALREADY_REVIEWED, 400));

    const { rating, comment } = req.body;

    const review = {
      user: req.user.id,
      rating: Number(rating),
      comment
    };

    product.reviews.push(review);
    product.calcAverageRating();
    await product.save();

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review
// @route   DELETE /products/:id/reviews/:rid
exports.deleteReview = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));

    const review = product.reviews.id(req.params.rid);
    if (!review) return next(new AppError(MESSAGES.REVIEW_NOT_FOUND, 404));

    if (review.user.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return next(new AppError(MESSAGES.NOT_AUTHORIZED_REVIEW, 403));
    }

    review.deleteOne();
    product.calcAverageRating();
    await product.save();

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews
// @route   GET /products/:id/reviews
exports.getReviews = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).select('reviews').lean();
    if (!product) return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
    res.status(200).json({ success: true, data: product.reviews });
  } catch (error) {
    next(error);
  }
};
