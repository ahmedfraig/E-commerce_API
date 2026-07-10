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
const validate = require('../middleware/validate.middleware');
const { addItemToCartSchema, updateItemQuantitySchema, applyCouponSchema } = require('../validation/cart.validation');

const router = express.Router();

router.use(protect);

router.get('/', getCart);
router.post('/items', validate(addItemToCartSchema), addItemToCart);
router.patch('/items', validate(updateItemQuantitySchema), updateItemQuantity);
router.delete('/items/:productId', removeItem);
router.post('/coupon', validate(applyCouponSchema), applyCoupon);
router.delete('/coupon', removeCoupon);
router.delete('/clear', clearCart);

module.exports = router;
