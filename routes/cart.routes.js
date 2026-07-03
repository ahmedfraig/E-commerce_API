const express = require('express');
const {
  getCart,
  addItemToCart,
  updateItemQuantity,
  removeItem,
  applyCoupon,
  removeCoupon,
  clearCart
} = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/', getCart);
router.post('/items', addItemToCart);
router.patch('/items', updateItemQuantity);
router.delete('/items/:productId', removeItem);
router.post('/coupon', applyCoupon);
router.delete('/coupon', removeCoupon);
router.delete('/clear', clearCart);

module.exports = router;
