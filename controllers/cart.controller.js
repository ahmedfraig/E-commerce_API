const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const AppError = require('../utils/AppError');
const { MESSAGES } = require('../utils/constants');
const AVAILABLE_COUPONS = require('../utils/coupons');

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
exports.getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};
exports.addItemToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await getOrCreateCart(req.user.id);
    const product = await Product.findById(productId);

    if (!product) throw new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404);
    if (!product.isActive) throw new AppError('This product is no longer available', 400);

    const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (existingItemIndex > -1) {
      const newTotal = cart.items[existingItemIndex].quantity + Number(quantity);
      if (product.stock < newTotal) throw new AppError(MESSAGES.NOT_ENOUGH_STOCK, 400);
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

    await cart.save();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};
exports.updateItemQuantity = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) throw new AppError(MESSAGES.CART_NOT_FOUND, 404);

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) throw new AppError(MESSAGES.ITEM_NOT_IN_CART, 404);

    const product = await Product.findById(productId);
    if (!product) throw new AppError(MESSAGES.PRODUCT_NOT_FOUND, 404);
    if (!product.isActive) throw new AppError('This product is no longer available', 400);

    if (product.stock < Number(quantity)) {
      throw new AppError(MESSAGES.NOT_ENOUGH_STOCK, 400);
    }

    cart.items[itemIndex].quantity = Number(quantity);
    cart.items[itemIndex].price = product.discountPrice > 0 ? product.discountPrice : product.price;

    await cart.save();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};
exports.removeItem = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) throw new AppError(MESSAGES.CART_NOT_FOUND, 404);

    const itemIndex = cart.items.findIndex(item => item.product.toString() === req.params.productId);
    if (itemIndex === -1) throw new AppError(MESSAGES.ITEM_NOT_IN_CART, 404);

    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') return next(new AppError('Please provide a valid coupon code.', 400));
    const upperCode = code.trim().toUpperCase();
    if (!upperCode) return next(new AppError('Please provide a valid coupon code.', 400));

    const coupon = AVAILABLE_COUPONS[upperCode];
    if (!coupon) return next(new AppError(MESSAGES.INVALID_COUPON, 400));

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return next(new AppError(MESSAGES.CART_NOT_FOUND, 404));

    if (cart.items.length === 0) {
      return next(new AppError('Add items to your cart before applying a coupon.', 400));
    }

    if (cart.coupon && cart.coupon.code) {
      return next(new AppError('A coupon is already applied. Remove it first.', 400));
    }

    cart.coupon = {
      code: upperCode,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue
    };

    await cart.save();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};
exports.removeCoupon = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return next(new AppError(MESSAGES.CART_NOT_FOUND, 404));

    if (!cart.coupon || !cart.coupon.code) {
      return next(new AppError('No coupon is currently applied to your cart.', 400));
    }

    cart.coupon = undefined;
    await cart.save();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) throw new AppError(MESSAGES.CART_NOT_FOUND, 404);

    cart.items = [];
    cart.coupon = undefined;
    await cart.save();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};
