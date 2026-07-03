const express = require('express');
const {
  createOrder,
  getMyOrders,
  getMyOrder,
  cancelOrder
} = require('../controllers/order.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.post('/', createOrder);
router.get('/my', getMyOrders);
router.get('/my/:id', getMyOrder);
router.patch('/my/:id/cancel', cancelOrder);

module.exports = router;
