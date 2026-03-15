const express = require('express');
const router = express.Router();
const { submitRating, getFarmerRatings, getRetailerRatings } = require('../controllers/ratingController');

router.post('/', submitRating);
router.get('/farmer/:farmerId', getFarmerRatings);
router.get('/retailer/:retailerId', getRetailerRatings);

module.exports = router;
