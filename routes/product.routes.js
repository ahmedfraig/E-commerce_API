const express = require('express');
const {
  getProducts,
  searchProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
  deleteReview,
  getReviews
} = require('../controllers/product.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/:id', getProduct);

router.post('/', protect, authorize('admin'), upload.array('images', 5), createProduct);
router.put('/update/:id', protect, authorize('admin'), upload.array('images', 5), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

router.post('/:id/reviews', protect, addReview);
router.delete('/:id/reviews/:rid', protect, deleteReview); // role logic handled in controller
router.get('/:id/reviews', getReviews);

module.exports = router;
