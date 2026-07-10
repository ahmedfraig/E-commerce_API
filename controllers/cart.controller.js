const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const Coupon = require('../models/Coupon.model');
const mongoose = require('mongoose');

// Helper to get or create cart
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
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
    const cart = await Cart.findOne({ user: req.user.id }).session(session)
      || await Cart.create([{ user: req.user.id, items: [] }], { session }).then(c => c[0]);
    const product = await Product.findById(productId).session(session);

    if (!product) throw new Error('Product not found');
    if (!product.isActive) throw new Error('This product is no longer available');
    if (product.stock < quantity) throw new Error('Not enough stock');

    const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += Number(quantity);
    } else {
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
    session.endSession();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
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
    if (!cart) throw new Error('Cart not found');

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) throw new Error('Item not in cart');

    const product = await Product.findById(productId).session(session);
    const oldQuantity = cart.items[itemIndex].quantity;
    const difference = Number(quantity) - oldQuantity;

    if (difference > 0 && product.stock < difference) {
      throw new Error('Not enough stock');
    }

    cart.items[itemIndex].quantity = Number(quantity);
    product.stock -= difference;

    await product.save({ session });
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// @desc    Remove item from cart
// @route   DELETE /carts/items/:productId
exports.removeItem = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const cart = await Cart.findOne({ user: req.user.id }).session(session);
    if (!cart) throw new Error('Cart not found');

    const itemIndex = cart.items.findIndex(item => item.product.toString() === req.params.productId);
    if (itemIndex === -1) throw new Error('Item not in cart');

    const quantity = cart.items[itemIndex].quantity;
    cart.items.splice(itemIndex, 1);

    const product = await Product.findById(req.params.productId).session(session);
    if (product) {
      product.stock += quantity;
      await product.save({ session });
    }

    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// @desc    Apply coupon
// @route   POST /carts/coupon
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    const upperCode = code.toUpperCase();

    const coupon = await Coupon.findOne({ code: upperCode, isActive: true });
    if (!coupon) {
      return res.status(400).json({ message: 'Invalid coupon code' });
    }

    if (coupon.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'This coupon has expired' });
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'This coupon has reached its usage limit' });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    // Check minimum order amount
    if (coupon.minOrderAmount > 0 && cart.subtotal < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `This coupon requires a minimum order of $${coupon.minOrderAmount}`
      });
    }

    cart.coupon = {
      code: upperCode,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue
    };

    // Atomically increment usedCount to prevent race conditions
    await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
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
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

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
    if (!cart) throw new Error('Cart not found');

    // Restore stock for all items
    await Promise.all(cart.items.map(async (item) => {
      const product = await Product.findById(item.product).session(session);
      if (product) {
        product.stock += item.quantity;
        await product.save({ session });
      }
    }));

    cart.items = [];
    cart.coupon = undefined;
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};
