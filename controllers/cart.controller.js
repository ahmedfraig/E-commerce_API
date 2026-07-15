const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const Coupon = require('../models/Coupon.model');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { MESSAGES } = require('../utils/constants');

const getOrCreateCart = async (userId, session = null) => {
  const query = Cart.findOne({ user: userId });
  if (session) query.session(session);

  let cart = await query;
  if (!cart) {
    const opts = session ? { session } : {};
    const created = await Cart.create([{ user: userId, items: [] }], opts);
    cart = created[0];
  }
  return cart;
};

// @desc    Get cart
// @route   GET /carts
exports.getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart
// @route   POST /carts/items
exports.addItemToCart = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { productId, quantity } = req.body;
    const cart = await getOrCreateCart(req.user.id, session);
    const product = await Product.findById(productId).session(session);

    if (!product) throw new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404);
    if (!product.isActive) throw new AppError('This product is no longer available', 400);

    const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (existingItemIndex > -1) {
      const newTotal = cart.items[existingItemIndex].quantity + Number(quantity);
      if (product.stock < Number(quantity)) throw new AppError(MESSAGES.NOT_ENOUGH_STOCK, 400);
      cart.items[existingItemIndex].quantity = newTotal;
      cart.items[existingItemIndex].price = product.discountPrice > 0 ? product.discountPrice : product.price;
    } else {
      if (product.stock < Number(quantity)) throw new AppError(MESSAGES.NOT_ENOUGH_STOCK, 400);
      cart.items.push({
        product: product._id,
        name: product.name,
        image: product.images[0]?.url || 'default',
        price: product.discountPrice > 0 ? product.discountPrice : product.price,
        quantity: Number(quantity)
      });
    }

    product.stock -= Number(quantity);
    await product.save({ session });
    await cart.save({ session });

    await session.commitTransaction();
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Update item quantity
// @route   PATCH /carts/items
exports.updateItemQuantity = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user.id }).session(session);
    if (!cart) throw new AppError(MESSAGES.CART_NOT_FOUND, 404);

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) throw new AppError(MESSAGES.ITEM_NOT_IN_CART, 404);

    const product = await Product.findById(productId).session(session);
    if (!product) throw new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404);
    if (!product.isActive) throw new AppError('This product is no longer available', 400);

    const oldQuantity = cart.items[itemIndex].quantity;
    const difference = Number(quantity) - oldQuantity;

    if (difference > 0 && product.stock < difference) {
      throw new AppError(MESSAGES.NOT_ENOUGH_STOCK, 400);
    }

    cart.items[itemIndex].quantity = Number(quantity);
    // Refresh the price to match current DB price
    cart.items[itemIndex].price = product.discountPrice > 0 ? product.discountPrice : product.price;
    product.stock -= difference;

    await product.save({ session });
    await cart.save({ session });

    await session.commitTransaction();
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Remove item from cart
// @route   DELETE /carts/items/:productId
exports.removeItem = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const cart = await Cart.findOne({ user: req.user.id }).session(session);
    if (!cart) throw new AppError(MESSAGES.CART_NOT_FOUND, 404);

    const itemIndex = cart.items.findIndex(item => item.product.toString() === req.params.productId);
    if (itemIndex === -1) throw new AppError(MESSAGES.ITEM_NOT_IN_CART, 404);

    const quantity = cart.items[itemIndex].quantity;
    cart.items.splice(itemIndex, 1);

    const product = await Product.findById(req.params.productId).session(session);
    if (product) {
      product.stock += quantity;
      await product.save({ session });
    }

    await cart.save({ session });

    await session.commitTransaction();
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Apply coupon
// @route   POST /carts/coupon
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    const upperCode = code.toUpperCase();

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return next(new AppError(MESSAGES.CART_NOT_FOUND, 404));

    // Prevent stacking — must remove existing coupon first
    if (cart.coupon && cart.coupon.code) {
      return next(new AppError('A coupon is already applied. Remove it first.', 400));
    }

    const coupon = await Coupon.findOne({ code: upperCode, isActive: true });
    if (!coupon) return next(new AppError(MESSAGES.INVALID_COUPON, 400));

    if (coupon.expiresAt < Date.now()) return next(new AppError(MESSAGES.COUPON_EXPIRED, 400));

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return next(new AppError(MESSAGES.COUPON_LIMIT_REACHED, 400));
    }

    if (coupon.minOrderAmount > 0 && cart.subtotal < coupon.minOrderAmount) {
      return next(new AppError(`This coupon requires a minimum order of $${coupon.minOrderAmount}`, 400));
    }

    cart.coupon = {
      code: upperCode,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue
    };

    // usedCount is incremented at order creation, not here
    await cart.save();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove coupon
// @route   DELETE /carts/coupon
exports.removeCoupon = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return next(new AppError(MESSAGES.CART_NOT_FOUND, 404));

    cart.coupon = undefined;
    await cart.save();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear cart
// @route   DELETE /carts/clear
exports.clearCart = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const cart = await Cart.findOne({ user: req.user.id }).session(session);
    if (!cart) throw new AppError(MESSAGES.CART_NOT_FOUND, 404);

    // Restore stock for each item sequentially
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    cart.items = [];
    cart.coupon = undefined;
    await cart.save({ session });

    await session.commitTransaction();
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
