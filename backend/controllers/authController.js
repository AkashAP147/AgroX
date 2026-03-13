const Farmer = require('../models/Farmer');
const Retailer = require('../models/Retailer');
const Transporter = require('../models/Transporter');

// In-memory OTP store (for hackathon demo — production would use Redis + SMS gateway)
const otpStore = new Map();

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || phone.length !== 10) {
      return res.status(400).json({ error: 'Valid 10-digit phone number required' });
    }
    const otp = generateOTP();
    otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 min expiry
    console.log(`[OTP] ${phone} → ${otp}`); // Log for demo/testing
    res.json({ message: 'OTP sent successfully', hint: otp }); // hint returned for demo only
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'phone and otp are required' });
    }
    const stored = otpStore.get(phone);
    if (!stored) {
      return res.status(400).json({ error: 'OTP not found. Please request a new one.' });
    }
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }
    if (stored.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    otpStore.delete(phone);
    res.json({ message: 'OTP verified', verified: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateFarmerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { upiId, upiQr } = req.body;
    const update = {};
    if (upiId !== undefined) update.upiId = upiId.trim();
    if (upiQr !== undefined) update.upiQr = upiQr;
    const farmer = await Farmer.findByIdAndUpdate(id, update, { new: true });
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });
    res.json({ message: 'Profile updated', user: farmer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.registerFarmer = async (req, res) => {
  try {
    const { name, phone, location } = req.body;
    if (!name || !phone || !location) {
      return res.status(400).json({ error: 'name, phone, and location are required' });
    }
    const existing = await Farmer.findOne({ phone });
    if (existing) return res.json({ message: 'Already registered', user: existing });

    const farmer = await Farmer.create({ name, phone, location });
    res.status(201).json({ message: 'Farmer registered', user: farmer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.registerRetailer = async (req, res) => {
  try {
    const { name, phone, location } = req.body;
    if (!name || !phone || !location) {
      return res.status(400).json({ error: 'name, phone, and location are required' });
    }
    const existing = await Retailer.findOne({ phone });
    if (existing) return res.json({ message: 'Already registered', user: existing });

    const retailer = await Retailer.create({ name, phone, location });
    res.status(201).json({ message: 'Retailer registered', user: retailer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.registerTransporter = async (req, res) => {
  try {
    const { name, phone, location, vehicleType } = req.body;
    if (!name || !phone || !location) {
      return res.status(400).json({ error: 'name, phone, and location are required' });
    }
    const existing = await Transporter.findOne({ phone });
    if (existing) return res.json({ message: 'Already registered', user: existing });

    const transporter = await Transporter.create({ name, phone, location, vehicleType });
    res.status(201).json({ message: 'Transporter registered', user: transporter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, role } = req.body;
    if (!phone || !role) {
      return res.status(400).json({ error: 'phone and role are required' });
    }
    let user;
    if (role === 'farmer') user = await Farmer.findOne({ phone });
    else if (role === 'retailer') user = await Retailer.findOne({ phone });
    else if (role === 'transporter') user = await Transporter.findOne({ phone });
    else return res.status(400).json({ error: 'Invalid role' });

    if (!user) return res.status(404).json({ error: 'User not found. Please register.' });
    res.json({ message: 'Login successful', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
