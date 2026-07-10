const Product = require('../models/Product.model');
const Order = require('../models/Order.model');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// Helper to upload images to Cloudinary
const uploadImages = async (files) => {
  const uploadPromises = files.map(async (file) => {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'ecommerce/products'
    });
    fs.unlinkSync(file.path); // Remove temp file
    return {
      public_id: result.public_id,
      url: result.secure_url
    };
  });
  return Promise.all(uploadPromises);
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

    let queryBuilder = Product.find(query).select('-reviews'); // Exclude heavy reviews array

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

    if (text) {
      query.$text = { $search: text };
    }
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
    if (!product) return res.status(404).json({ message: 'Product not found' });
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
    
    // Create product instance and validate BEFORE uploading images
    const product = new Product(req.body);
    await product.validate();

    if (req.files && req.files.length > 0) {
      product.images = await uploadImages(req.files);
    }
    
    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    // If validation fails and there are files, clean up temp files
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
      return res.status(404).json({ message: 'Product not found' });
    }

    // Apply text field updates first
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

    // Validate the updated product BEFORE Cloudinary operations
    await product.validate();

    // Now it's safe to do Cloudinary operations
    let newImages = [];
    if (req.files && req.files.length > 0) {
      newImages = await uploadImages(req.files);
    }

    if (req.body.deletedImages) {
      const deletedImages = JSON.parse(req.body.deletedImages);
      
      // Only delete images that actually belong to this product
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
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Soft delete: keep the product and its images, just mark it inactive
    // This preserves historical data in Orders and Carts
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
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (!product.isActive) {
      return res.status(400).json({ message: 'Cannot review an inactive product' });
    }

    // Verified Buyer Check
    const hasBought = await Order.findOne({
      user: req.user.id,
      status: 'delivered',
      'items.product': product._id
    });

    if (!hasBought) {
      return res.status(403).json({ message: 'You must purchase and receive this product to review it' });
    }

    const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user.id.toString());
    if (alreadyReviewed) return res.status(400).json({ message: 'Product already reviewed' });

    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }
    if (Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

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
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const review = product.reviews.id(req.params.rid);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (review.user.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
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
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json({ success: true, data: product.reviews });
  } catch (error) {
    next(error);
  }
};
