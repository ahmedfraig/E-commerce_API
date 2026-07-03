const express = require('express');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist
} = require('../controllers/wishlist.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/my', getWishlist);
router.post('/add/:productId', addToWishlist);
router.delete('/remove/:productId', removeFromWishlist);
router.delete('/clear', clearWishlist);

module.exports = router;
