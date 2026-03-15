const express = require('express');
const router = express.Router();
const { registerFarmer, registerRetailer, registerTransporter, login, sendOTP, verifyOTP, updateFarmerProfile, googleRegister, googleLogin } = require('../controllers/authController');
// Google Auth
router.post('/google/register', googleRegister);
router.post('/google/login', googleLogin);

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/register/farmer', registerFarmer);
router.post('/register/retailer', registerRetailer);
router.post('/register/transporter', registerTransporter);
router.post('/login', login);


router.put('/profile/farmer/:id', updateFarmerProfile);
router.put('/profile/transporter/:id', require('../controllers/authController').updateTransporterProfile);
router.put('/profile/retailer/:id', require('../controllers/authController').updateRetailerProfile);

module.exports = router;
