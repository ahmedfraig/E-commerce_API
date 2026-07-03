const express = require('express');
const {
  getDashboardStats,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  getAllCarts,
  getAllWishlists,
  getWishlistStats
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderDetails);
router.patch('/orders/:id/status', updateOrderStatus);
router.get('/carts', getAllCarts);
router.get('/wishlists', getAllWishlists);
router.get('/wishlists/stats', getWishlistStats);

module.exports = router;
