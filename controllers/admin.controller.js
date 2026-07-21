const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Wishlist = require('../models/Wishlist.model');
const Product = require('../models/Product.model');
const User = require('../models/User.model');
const sendEmail = require('../utils/sendEmail');
const { orderStatusUpdateEmail } = require('../utils/emailTemplates');
const AppError = require('../utils/AppError');
const { MESSAGES } = require('../utils/constants');

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

    const realizedRevenueMatch = {
      $and: [
        { status: { $nin: ['cancelled', 'returned'] } },
        { paymentStatus: { $ne: 'refunded' } },
        {
          $or: [
            { paymentStatus: 'paid' },
            { paymentMethod: 'cash', status: 'delivered' }
          ]
        }
      ]
    };

    const [
      totalRevenueAgg,
      thisMonthRevenueAgg,
      lastMonthRevenueAgg,
      ordersByStatus,
      totalCustomers,
      totalAdmins,
      totalProducts,
      topProducts,
      dailyRevenue,
      recentOrders
    ] = await Promise.all([
      // Total realized revenue
      Order.aggregate([
        { $match: realizedRevenueMatch },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      // This month revenue
      Order.aggregate([
        { $match: { createdAt: { $gte: thisMonthStart }, ...realizedRevenueMatch } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      // Last month revenue
      Order.aggregate([
        { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }, ...realizedRevenueMatch } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),
      // Orders grouped by status
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Total customers
      User.countDocuments({ role: 'customer' }),
      // Total admins
      User.countDocuments({ role: 'admin' }),
      // Total products
      Product.countDocuments(),
      // Top products by sales
      Order.aggregate([
        { $match: realizedRevenueMatch },
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
        { $match: { createdAt: { $gte: sevenDaysAgo }, ...realizedRevenueMatch } },
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
        .limit(5)
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

    const formattedDailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      const existingDay = dailyRevenue.find(item => item._id === dateString);
      formattedDailyRevenue.push({
        _id: dateString,
        revenue: existingDay ? existingDay.revenue : 0,
        orders: existingDay ? existingDay.orders : 0
      });
    }

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
        dailyRevenue: formattedDailyRevenue,
        totalCustomers,
        totalAdmins,
        totalProducts
      }
    });
  } catch (error) {
    next(error);
  }
};
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
exports.getOrderDetails = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'username email phone').lean();
    if (!order) return next(new AppError(MESSAGES.ORDER_NOT_FOUND, 404));
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};
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
      const { subject, html } = orderStatusUpdateEmail(order, status);
      await sendEmail({
        email: order.user.email,
        subject,
        html
      });
    } catch (err) {
      console.log('Email could not be sent', err);
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};
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
