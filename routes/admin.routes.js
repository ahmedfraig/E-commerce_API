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
const validate = require('../middleware/validate.middleware');
const { updateOrderStatusSchema } = require('../validation/order.validation');

const router = express.Router();

router.use(protect, authorize('admin'));

// Static routes MUST come before dynamic /:id routes
router.get('/dashboard', getDashboardStats);
router.get('/carts', getAllCarts);
router.get('/wishlists/stats', getWishlistStats);
router.get('/wishlists', getAllWishlists);
router.get('/', getAllOrders);

// Dynamic routes at the bottom
router.get('/:id', getOrderDetails);
router.patch('/:id/status', validate(updateOrderStatusSchema), updateOrderStatus);

module.exports = router;
