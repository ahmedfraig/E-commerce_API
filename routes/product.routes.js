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
const validate = require('../middleware/validate.middleware');
const { createProductSchema, updateProductSchema, addReviewSchema } = require('../validation/product.validation');

const router = express.Router();

router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/:id', getProduct);

router.post('/', protect, authorize('admin'), upload.array('images', 5), validate(createProductSchema), createProduct);
router.put('/update/:id', protect, authorize('admin'), upload.array('images', 5), validate(updateProductSchema), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

router.post('/:id/reviews', protect, validate(addReviewSchema), addReview);
router.delete('/:id/reviews/:rid', protect, deleteReview);
router.get('/:id/reviews', getReviews);

module.exports = router;
