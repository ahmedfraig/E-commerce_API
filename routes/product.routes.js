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
const { createProductSchema, updateProductSchema, addReviewSchema, productIdSchema, reviewIdSchema } = require('../validation/product.validation');

const router = express.Router();

router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/:id', validate(productIdSchema, 'params'), getProduct);

router.post('/', protect, authorize('admin'), upload.array('images', 5), validate(createProductSchema), createProduct);
router.put('/update/:id', protect, authorize('admin'), validate(productIdSchema, 'params'), upload.array('images', 5), validate(updateProductSchema), updateProduct);
router.delete('/:id', protect, authorize('admin'), validate(productIdSchema, 'params'), deleteProduct);

router.post('/:id/reviews', protect, validate(productIdSchema, 'params'), validate(addReviewSchema), addReview);
router.delete('/:id/reviews/:rid', protect, validate(reviewIdSchema, 'params'), deleteReview);
router.get('/:id/reviews', validate(productIdSchema, 'params'), getReviews);

module.exports = router;
