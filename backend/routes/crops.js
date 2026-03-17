const express = require('express');
const router = express.Router();
const { addCrop, getFarmerCrops, getAllCrops, syncCrops, getRecommendedCrops, getAllCropsForRetailer, updateCrop } = require('../controllers/cropController');
// Retailer endpoints
router.get('/recommended/:retailerId', getRecommendedCrops);
router.get('/all', getAllCropsForRetailer);

const { deleteCrop } = require('../controllers/cropController');

router.post('/add', addCrop);
router.put('/:cropId', updateCrop); // <-- Add update route
router.delete('/:cropId', deleteCrop);
router.get('/farmer/:farmerId', getFarmerCrops);
router.get('/marketplace', getAllCrops);
router.post('/sync', syncCrops);

module.exports = router;
