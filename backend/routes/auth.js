const express = require('express');
const router = express.Router();
const { registerFarmer, registerRetailer, registerTransporter, login, sendOTP, verifyOTP, updateFarmerProfile } = require('../controllers/authController');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/register/farmer', registerFarmer);
router.post('/register/retailer', registerRetailer);
router.post('/register/transporter', registerTransporter);
router.post('/login', login);
router.put('/profile/farmer/:id', updateFarmerProfile);

module.exports = router;
