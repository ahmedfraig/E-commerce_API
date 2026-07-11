const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Wishlist = require('../models/Wishlist.model');
const Product = require('../models/Product.model');
const User = require('../models/User.model');
const sendEmail = require('../utils/sendEmail');
const AppError = require('../utils/AppError');
const { MESSAGES } = require('../utils/constants');

// @desc    Get Admin Dashboard Stats
// @route   GET /admin/dashboard
exports.getDashboardStats = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalRevenue, orderCounts, totalCustomers, topProducts, dailyRevenue, lowStockProducts] = await Promise.all([
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      Order.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      Order.aggregate([
        { $unwind: '$items' },
        { $group: { _id: '$items.product', name: { $first: '$items.name' }, sold: { $sum: '$items.quantity' } } },
        { $sort: { sold: -1 } },
        { $limit: 5 }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo }, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalPrice' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Product.find({ isActive: true, stock: { $lte: 10 } }).select('name stock').sort('stock').limit(10).lean()
    ]);

    res.status(200).json({
      success: true,
      data: {
        revenue: totalRevenue[0] ? totalRevenue[0].total : 0,
        orderCounts,
        totalCustomers,
        topProducts,
        dailyRevenue,
        lowStockProducts
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders
// @route   GET /admin/orders
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, paymentMethod, startDate, endDate, sort, page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    let query = {};

    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let queryBuilder = Order.find(query).populate('user', 'username email');
    if (sort) {
      queryBuilder = queryBuilder.sort(sort.split(',').join(' '));
    } else {
      queryBuilder = queryBuilder.sort('-createdAt');
    }

    const skip = (page - 1) * limit;
    const orders = await queryBuilder.skip(skip).limit(Number(limit)).lean();
    const total = await Order.countDocuments(query);

    res.status(200).json({ success: true, count: orders.length, total, data: orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific order details
// @route   GET /admin/orders/:id
exports.getOrderDetails = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'username email phone').lean();
    if (!order) return next(new AppError(MESSAGES.ORDER_NOT_FOUND, 404));
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PATCH /admin/orders/:id/status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id).populate('user', 'email');
    if (!order) return next(new AppError(MESSAGES.ORDER_NOT_FOUND, 404));

    // Enforce valid status transitions
    const validTransitions = {
      pending:    ['confirmed', 'cancelled'],
      confirmed:  ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped:    ['delivered'],
      delivered:  ['returned'],
      cancelled:  [],
      returned:   []
    };

    const allowed = validTransitions[order.status];
    if (!allowed || !allowed.includes(status)) {
      return next(new AppError(`Cannot transition order from "${order.status}" to "${status}"`, 400));
    }

    order.status = status;
    if (status === 'delivered') order.deliveredAt = Date.now();
    if (status === 'cancelled') order.cancelledAt = Date.now();
    await order.save();

    // Send automated email
    try {
      await sendEmail({
        email: order.user.email,
        subject: 'Order Status Update',
        message: `Your order ${order._id} status is now: ${status}.`
      });
    } catch (err) {
      console.log('Email could not be sent', err);
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    View all active carts
// @route   GET /admin/carts
exports.getAllCarts = async (req, res, next) => {
  try {
    const { page: pageQuery = 1, limit: limitQuery = 10 } = req.query;
    const page = parseInt(pageQuery, 10);
    const limit = Math.min(parseInt(limitQuery, 10), 100);
    const skip = (page - 1) * limit;

    const [carts, total] = await Promise.all([
      Cart.find().populate('user', 'username email').skip(skip).limit(limit).lean(),
      Cart.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      count: carts.length,
      pagination: { total, page, pages: Math.ceil(total / limit) },
      data: carts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    View all wishlists
// @route   GET /admin/wishlists
exports.getAllWishlists = async (req, res, next) => {
  try {
    const { page = 1 } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const skip = (page - 1) * limit;

    const wishlists = await Wishlist.find()
      .populate('user', 'username email')
      .skip(skip)
      .limit(Number(limit))
      .lean();
    
    const total = await Wishlist.countDocuments();

    res.status(200).json({ success: true, count: wishlists.length, total, data: wishlists });
  } catch (error) {
    next(error);
  }
};

// @desc    Get top wishlisted products
// @route   GET /admin/wishlists/stats
exports.getWishlistStats = async (req, res, next) => {
  try {
    const stats = await Wishlist.aggregate([
      { $unwind: '$products' },
      { $group: { _id: '$products', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productDetails' } },
      { $unwind: '$productDetails' },
      { $project: { _id: 1, count: 1, name: '$productDetails.name', price: '$productDetails.price' } }
    ]);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
