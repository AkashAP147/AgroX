const express = require('express');
const router = express.Router();
const {
  getPendingDeliveries, getTransporterDeliveries,
  acceptDelivery, updateDeliveryStatus
} = require('../controllers/deliveryController');

router.get('/pending', getPendingDeliveries);
router.get('/transporter/:transporterId', getTransporterDeliveries);
router.put('/:deliveryId/accept', acceptDelivery);
router.put('/:deliveryId/status', updateDeliveryStatus);

module.exports = router;
