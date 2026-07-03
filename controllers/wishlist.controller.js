const Wishlist = require('../models/Wishlist.model');
const Product = require('../models/Product.model');

// Helper
const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [] });
  }
  return wishlist;
};

// @desc    Get user's wishlist
// @route   GET /wishlists/my
exports.getWishlist = async (req, res, next) => {
  try {
    const wishlist = await getOrCreateWishlist(req.user.id);
    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    next(error);
  }
};

// @desc    Add product to wishlist
// @route   POST /wishlists/add/:productId
exports.addToWishlist = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    let wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user.id, products: [] });
    }

    if (!wishlist.products.includes(req.params.productId)) {
      wishlist.products.push(req.params.productId);
      await wishlist.save();
    }

    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /wishlists/remove/:productId
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== req.params.productId
    );
    await wishlist.save();

    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear wishlist
// @route   DELETE /wishlists/clear
exports.clearWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

    wishlist.products = [];
    await wishlist.save();

    res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    next(error);
  }
};
