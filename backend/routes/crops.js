const express = require('express');
const router = express.Router();
const { addCrop, getFarmerCrops, getAllCrops, syncCrops } = require('../controllers/cropController');

router.post('/add', addCrop);
router.get('/farmer/:farmerId', getFarmerCrops);
router.get('/marketplace', getAllCrops);
router.post('/sync', syncCrops);

module.exports = router;
