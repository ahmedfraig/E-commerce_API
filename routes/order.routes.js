const express = require('express');
const {
  createOrder,
  getMyOrders,
  getMyOrder,
  cancelOrder,
  createPaymentIntent
} = require('../controllers/order.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createOrderSchema, orderIdSchema } = require('../validation/order.validation');

const router = express.Router();

router.use(protect);

router.post('/', validate(createOrderSchema), createOrder);
router.post('/create-payment-intent', createPaymentIntent);
router.get('/my', getMyOrders);
router.get('/my/:id', validate(orderIdSchema, 'params'), getMyOrder);
router.patch('/my/:id/cancel', validate(orderIdSchema, 'params'), cancelOrder);

module.exports = router;
