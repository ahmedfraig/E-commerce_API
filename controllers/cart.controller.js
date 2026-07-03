const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');

const availableCoupons = {
  'SAVE10': { type: 'percentage', value: 10 },
  'SAVE20': { type: 'percentage', value: 20 },
  'SAVE50': { type: 'percentage', value: 50 },
  'SAVE80': { type: 'percentage', value: 80 },
  'OFF50': { type: 'fixed', value: 50 }
};

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
  try {
    const { productId, quantity } = req.body;
    const cart = await getOrCreateCart(req.user.id);
    const product = await Product.findById(productId);

    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ message: 'Not enough stock' });

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
    await product.save();
    await cart.save();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// @desc    Update item quantity
// @route   PATCH /carts/items
exports.updateItemQuantity = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) return res.status(404).json({ message: 'Item not in cart' });

    const product = await Product.findById(productId);
    const oldQuantity = cart.items[itemIndex].quantity;
    const difference = Number(quantity) - oldQuantity;

    if (difference > 0 && product.stock < difference) {
      return res.status(400).json({ message: 'Not enough stock' });
    }

    cart.items[itemIndex].quantity = Number(quantity);
    product.stock -= difference;

    await product.save();
    await cart.save();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /carts/items/:productId
exports.removeItem = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const itemIndex = cart.items.findIndex(item => item.product.toString() === req.params.productId);
    if (itemIndex === -1) return res.status(404).json({ message: 'Item not in cart' });

    const quantity = cart.items[itemIndex].quantity;
    cart.items.splice(itemIndex, 1);

    const product = await Product.findById(req.params.productId);
    if (product) {
      product.stock += quantity;
      await product.save();
    }

    await cart.save();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

// @desc    Apply coupon
// @route   POST /carts/coupon
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    const upperCode = code.toUpperCase();

    if (!availableCoupons[upperCode]) {
      return res.status(400).json({ message: 'Invalid coupon code' });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.coupon = {
      code: upperCode,
      discountType: availableCoupons[upperCode].type,
      discountValue: availableCoupons[upperCode].value
    };

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
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    // Restore stock for all items
    await Promise.all(cart.items.map(async (item) => {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }));

    cart.items = [];
    cart.coupon = undefined;
    await cart.save();

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};
