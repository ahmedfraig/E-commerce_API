const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const mongoose = require('mongoose');
const sendEmail = require('../utils/sendEmail');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// @desc    Create a new order
// @route   POST /orders
exports.createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { shippingAddress, paymentMethod, customerNote } = req.body;
    
    const cart = await Cart.findOne({ user: req.user.id }).session(session);
    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    const subtotal = cart.subtotal;
    const shippingFee = subtotal >= 1000 ? 0 : 50;
    const tax = subtotal * 0.14; // 14% VAT
    const discount = cart.discountAmount;
    const totalPrice = subtotal + shippingFee + tax - discount;

    const orderItems = cart.items.map(item => ({
      product: item.product,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity
    }));

    const order = await Order.create([{
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending', // Stripe flow later
      subtotal,
      shippingFee,
      tax,
      discount,
      totalPrice,
      customerNote
    }], { session });

    // Clear cart
    cart.items = [];
    cart.coupon = undefined;
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Send order confirmation email
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
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// @desc    Create Stripe Payment Intent
// @route   POST /orders/create-payment-intent
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const subtotal = cart.subtotal;
    const shippingFee = subtotal >= 1000 ? 0 : 50;
    const tax = subtotal * 0.14;
    const discount = cart.discountAmount;
    const totalPrice = subtotal + shippingFee + tax - discount;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalPrice * 100), // Stripe expects amounts in cents
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

  // Handle successful payment
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    // In a real scenario, you'd find the order by paymentIntent.id and mark it paid.
    console.log('Payment succeeded for User ID:', paymentIntent.metadata.userId);
  }

  res.status(200).json({ received: true });
};

// @desc    Get logged in user orders
// @route   GET /orders/my
exports.getMyOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let query = { user: req.user.id };
    
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const orders = await Order.find(query).skip(skip).limit(Number(limit)).sort('-createdAt').lean();
    const total = await Order.countDocuments(query);

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
    if (!order) return res.status(404).json({ message: 'Order not found' });
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
    
    if (!order) throw new Error('Order not found');
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      throw new Error('You cannot cancel an order that is already processing or shipped');
    }

    order.status = 'cancelled';
    order.cancelledAt = Date.now();
    await order.save({ session });

    // Restore stock
    await Promise.all(order.items.map(async (item) => {
      const product = await Product.findById(item.product).session(session);
      if (product) {
        product.stock += item.quantity;
        await product.save({ session });
      }
    }));

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};
