const express = require('express');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist
} = require('../controllers/wishlist.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { wishlistProductIdSchema } = require('../validation/wishlist.validation');

const router = express.Router();

router.use(protect);

router.get('/my', getWishlist);
router.post('/add/:productId', validate(wishlistProductIdSchema, 'params'), addToWishlist);
router.delete('/remove/:productId', validate(wishlistProductIdSchema, 'params'), removeFromWishlist);
router.delete('/clear', clearWishlist);

module.exports = router;
