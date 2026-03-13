const express = require('express');
const router = express.Router();
const {
  createOrder, getFarmerOrders, getRetailerOrders,
  updateOrderStatus, payOrder, getOrderDetails
} = require('../controllers/orderController');

router.post('/create', createOrder);
router.get('/farmer/:farmerId', getFarmerOrders);
router.get('/retailer/:retailerId', getRetailerOrders);
router.get('/:orderId/details', getOrderDetails);
router.put('/:orderId/status', updateOrderStatus);
router.post('/:orderId/pay', payOrder);

module.exports = router;
