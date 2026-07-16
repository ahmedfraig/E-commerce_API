const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const mongoose = require('mongoose');
const sendEmail = require('../utils/sendEmail');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AppError = require('../utils/AppError');
const { MESSAGES } = require('../utils/constants');

const VALID_ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

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

    const orderItems = [];
    let freshSubtotal = 0;

    for (const item of cart.items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.product, isActive: true, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session, new: true }
      );
      if (!product) {
        throw new AppError(`"${item.name}" is unavailable or out of stock`, 400);
      }

      const freshPrice = product.discountPrice > 0 ? product.discountPrice : product.price;
      freshSubtotal += freshPrice * item.quantity;

      orderItems.push({
        product: item.product,
        name: item.name,
        image: item.image,
        price: freshPrice,
        quantity: item.quantity
      });
    }

    let discount = 0;
    if (cart.coupon && cart.coupon.code) {
      if (cart.coupon.discountType === 'percentage') {
        discount = Math.min((freshSubtotal * cart.coupon.discountValue) / 100, freshSubtotal);
      } else {
        discount = Math.min(cart.coupon.discountValue, freshSubtotal);
      }
    }
    const shippingFee = freshSubtotal >= 1000 ? 0 : 50;
    const tax = freshSubtotal * 0.14;
    const totalPrice = freshSubtotal + shippingFee + tax - discount;

    const order = await Order.create([{
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'pending',
      subtotal: freshSubtotal,
      shippingFee,
      tax,
      discount,
      couponCode: cart.coupon?.code || null,
      totalPrice,
      customerNote
    }], { session });

    cart.items = [];
    cart.coupon = undefined;
    await cart.save({ session });

    await session.commitTransaction();

    try {
      const emailMessage = `
        Thank you for your order!
        Order ID: ${order[0]._id}
        Total Price: $${order[0].totalPrice.toFixed(2)}
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
    const { orderId } = req.body;
    if (!orderId) return next(new AppError('orderId is required', 400));

    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) return next(new AppError(MESSAGES.ORDER_NOT_FOUND, 404));

    if (order.paymentMethod !== 'stripe') {
      return next(new AppError('This order does not use Stripe as the payment method', 400));
    }
    if (order.paymentStatus === 'paid') {
      return next(new AppError('This order has already been paid', 400));
    }
    if (order.status === 'cancelled') {
      return next(new AppError('Cannot pay for a cancelled order', 400));
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalPrice * 100),
      currency: 'usd',
      metadata: {
        userId: req.user.id.toString(),
        orderId: orderId.toString()
      }
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
    const { orderId } = paymentIntent.metadata;

    if (orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        if (order.status === 'cancelled') {
          // Race condition: User cancelled the order while the Stripe checkout tab was open, 
          // and then paid for it. We must refund them immediately so they don't lose money 
          // on an order that already had its stock restored.
          try {
            await stripe.refunds.create({ payment_intent: paymentIntent.id });
            order.paymentStatus = 'refunded';
            order.transactionId = paymentIntent.id;
            await order.save();
          } catch (err) {
            console.error('Failed to automatically refund cancelled order:', err);
          }
        } else {
          order.paymentStatus = 'paid';
          order.paidAt = Date.now();
          order.status = 'confirmed';
          order.transactionId = paymentIntent.id;
          await order.save();
        }
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const { orderId } = paymentIntent.metadata;

    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'failed'
      });
    }
  }

  res.status(200).json({ received: true });
};

// @desc    Get logged in user orders
// @route   GET /orders/my
exports.getMyOrders = async (req, res, next) => {
  try {
    const { status, page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const pageNum = parseInt(page, 10) || 1;

    if (status && !VALID_ORDER_STATUSES.includes(status)) {
      return next(new AppError(`Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}`, 400));
    }

    let query = { user: req.user.id };
    if (status) query.status = status;

    const skip = (pageNum - 1) * limit;
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
    
    if (order.paymentStatus === 'paid') {
      if (order.paymentMethod === 'stripe' && order.transactionId) {
        // Issue automatic refund via Stripe
        await stripe.refunds.create({
          payment_intent: order.transactionId
        });
        order.paymentStatus = 'refunded';
      } else {
        throw new AppError('You cannot cancel an order that has already been paid via this method. Please contact support.', 400);
      }
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
