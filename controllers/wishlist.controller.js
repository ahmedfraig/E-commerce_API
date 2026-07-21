const Wishlist = require('../models/Wishlist.model');
const Product = require('../models/Product.model');
const AppError = require('../utils/AppError');
const { MESSAGES } = require('../utils/constants');
exports.getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate({
        path: 'products',
        match: { isActive: true },
        select: 'name price discountPrice images stock'
      })
      .lean();

    if (!wishlist) {
      const created = await Wishlist.create({ user: req.user.id, products: [] });
      wishlist = created.toObject();
    }

    // Filter out nulls in case some products were permanently deleted from DB
    if (wishlist.products) {
      wishlist.products = wishlist.products.filter(p => p !== null);
    }

    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    next(error);
  }
};
exports.addToWishlist = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return next(new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404));
    if (!product.isActive) return next(new AppError('This product is no longer available', 400));

    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user.id },
      { $addToSet: { products: req.params.productId } },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    next(error);
  }
};
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user.id },
      { $pull: { products: req.params.productId } },
      { new: true }
    );

    if (!wishlist) return next(new AppError(MESSAGES.WISHLIST_NOT_FOUND, 404));

    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    next(error);
  }
};
exports.clearWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user.id },
      { $set: { products: [] } },
      { new: true }
    );

    if (!wishlist) return next(new AppError(MESSAGES.WISHLIST_NOT_FOUND, 404));

    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    next(error);
  }
};
