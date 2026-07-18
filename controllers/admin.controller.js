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
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    // Current month boundaries
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // Last month boundaries
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      totalRevenueAgg,
      thisMonthRevenueAgg,
      lastMonthRevenueAgg,
      ordersByStatus,
      totalCustomers,
      topProducts,
      dailyRevenue,
      recentOrders
    ] = await Promise.all([
      // Total revenue (excluding cancelled)
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      // This month revenue
      Order.aggregate([
        { $match: { createdAt: { $gte: thisMonthStart }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      // Last month revenue
      Order.aggregate([
        { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      // Orders grouped by status
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Total customers
      User.countDocuments({ role: 'customer' }),
      // Top products by sales
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            image: { $first: '$items.image' },
            totalSold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 }
      ]),
      // Daily revenue (last 7 days)
      Order.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo }, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalPrice' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Recent orders
      Order.find()
        .sort('-createdAt')
        .limit(10)
        .populate('user', 'username email')
        .lean()
    ]);

    // Build orders breakdown from aggregation
    const statusList = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const orders = { total: 0 };
    statusList.forEach(s => { orders[s] = 0; });
    ordersByStatus.forEach(({ _id, count }) => {
      orders[_id] = count;
      orders.total += count;
    });

    // Revenue calculations
    const totalRev = totalRevenueAgg[0]?.total || 0;
    const thisMonthRev = thisMonthRevenueAgg[0]?.total || 0;
    const lastMonthRev = lastMonthRevenueAgg[0]?.total || 0;
    const growthPercent = lastMonthRev > 0
      ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100)
      : 0;

    res.status(200).json({
      success: true,
      dashboard: {
        orders,
        revenue: {
          total: totalRev,
          thisMonth: thisMonthRev,
          lastMonth: lastMonthRev,
          growthPercent
        },
        recentOrders,
        topProducts,
        ordersByStatus,
        dailyRevenue,
        totalCustomers
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
    const { status, paymentMethod, startDate, endDate, sort } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    let query = {};

    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
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

    if (status === 'cancelled') {
      order.cancelledAt = Date.now();

      // Restore stock for each item
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }

      // Mark payment as refunded if already paid
      if (order.paymentStatus === 'paid') {
        order.paymentStatus = 'refunded';
      }
    }

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
    const page = parseInt(req.query.page, 10) || 1;
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
