const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const Coupon = require('../models/Coupon.model');
const mongoose = require('mongoose');
const sendEmail = require('../utils/sendEmail');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AppError = require('../utils/AppError');
const { MESSAGES } = require('../utils/constants');

// @desc    Create a new order
// @route   POST /orders
exports.createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { shippingAddress, paymentMethod, customerNote } = req.body;

    const cart = await Cart.findOne({ user: req.user.id }).session(session);
    if (!cart || cart.items.length === 0) {
      throw new AppError(MESSAGES.CART_EMPTY, 400);
    }

    const subtotal = cart.subtotal;
    const shippingFee = subtotal >= 1000 ? 0 : 50;
    const tax = subtotal * 0.14;
    const discount = cart.discountAmount;
    const totalPrice = subtotal + shippingFee + tax - discount;

    const orderItems = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product || !product.isActive) {
        throw new AppError(`Product "${item.name}" is no longer available`, 400);
      }

      // Stock was already reserved at add-to-cart time — verify it's still valid
      if (product.stock < 0) {
        throw new AppError(`Stock inconsistency for "${item.name}". Please update your cart.`, 400);
      }

      orderItems.push({
        product: item.product,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity
      });
    }

    const order = await Order.create([{
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'pending',
      subtotal,
      shippingFee,
      tax,
      discount,
      totalPrice,
      customerNote
    }], { session });

    if (cart.coupon && cart.coupon.code) {
      const updatedCoupon = await Coupon.findOneAndUpdate(
        { 
          code: cart.coupon.code,
          isActive: true,
          expiresAt: { $gt: Date.now() },
          $or: [
            { usageLimit: null },
            { $expr: { $lt: ["$usedCount", "$usageLimit"] } }
          ],
          minOrderAmount: { $lte: cart.subtotal }
        },
        { $inc: { usedCount: 1 } },
        { session, new: true }
      );

      if (!updatedCoupon) {
        throw new AppError('The applied coupon is invalid, expired, or no longer applicable. Please review your cart.', 400);
      }
    }

    cart.items = [];
    cart.coupon = undefined;
    await cart.save({ session });

    await session.commitTransaction();

    try {
      const emailMessage = `
        Thank you for your order!
        Order ID: ${order[0]._id}
        Total Price: $${order[0].totalPrice}
        We will notify you once it ships.
      `;
      await sendEmail({
        email: req.user.email,
        subject: 'Order Confirmation',
        message: emailMessage
      });
    } catch (err) {
      console.error('Order confirmation email could not be sent', err);
    }

    res.status(201).json({ success: true, data: order[0] });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Create Stripe Payment Intent
// @route   POST /orders/create-payment-intent
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart || cart.items.length === 0) {
      return next(new AppError(MESSAGES.CART_EMPTY, 400));
    }

    // Validate coupon before calculating final price for Stripe
    if (cart.coupon && cart.coupon.code) {
      const coupon = await Coupon.findOne({
        code: cart.coupon.code,
        isActive: true,
        expiresAt: { $gt: Date.now() },
        $or: [
          { usageLimit: null },
          { $expr: { $lt: ["$usedCount", "$usageLimit"] } }
        ],
        minOrderAmount: { $lte: cart.subtotal }
      });

      if (!coupon) {
        return next(new AppError('The applied coupon is invalid or no longer applicable. Please review your cart.', 400));
      }
    }

    const subtotal = cart.subtotal;
    const shippingFee = subtotal >= 1000 ? 0 : 50;
    const tax = subtotal * 0.14;
    const discount = cart.discountAmount;
    const totalPrice = subtotal + shippingFee + tax - discount;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalPrice * 100),
      currency: 'usd',
      metadata: { userId: req.user.id.toString() }
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stripe Webhook
// @route   POST /webhook
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    console.log('Payment succeeded for User ID:', paymentIntent.metadata.userId);
  }

  res.status(200).json({ received: true });
};

// @desc    Get logged in user orders
// @route   GET /orders/my
exports.getMyOrders = async (req, res, next) => {
  try {
    const { status, page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    let query = { user: req.user.id };

    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(query).skip(skip).limit(Number(limit)).sort('-createdAt').lean(),
      Order.countDocuments(query)
    ]);

    res.status(200).json({ success: true, count: orders.length, total, data: orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order (owner only)
// @route   GET /orders/my/:id
exports.getMyOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).lean();
    if (!order) return next(new AppError(MESSAGES.ORDER_NOT_FOUND, 404));
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel an order
// @route   PATCH /orders/my/:id/cancel
exports.cancelOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).session(session);

    if (!order) throw new AppError(MESSAGES.ORDER_NOT_FOUND, 404);
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      throw new AppError(MESSAGES.CANNOT_CANCEL_ORDER, 400);
    }

    order.status = 'cancelled';
    order.cancelledAt = Date.now();
    await order.save({ session });

    // Restore stock sequentially for session safety
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    await session.commitTransaction();
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
