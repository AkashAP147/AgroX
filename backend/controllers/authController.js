// Update Retailer Profile
exports.updateRetailerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, name, location, photoURL } = req.body;
    const update = {};
    if (phone !== undefined) update.phone = phone;
    if (name !== undefined) update.name = name;
    if (location !== undefined) update.location = location;
    if (photoURL !== undefined) update.photoURL = photoURL;
    const retailer = await Retailer.findByIdAndUpdate(id, update, { new: true });
    if (!retailer) return res.status(404).json({ error: 'Retailer not found' });
    res.json({ message: 'Profile updated', user: retailer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Update Transporter Profile
exports.updateTransporterProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, name, photoURL, location, vehicleType } = req.body;
    const update = {};
    if (phone !== undefined) update.phone = phone;
    if (name !== undefined) update.name = name;
    if (photoURL !== undefined) update.photoURL = photoURL;
    if (location !== undefined) update.location = location;
    if (vehicleType !== undefined) update.vehicleType = vehicleType;
    const transporter = await Transporter.findByIdAndUpdate(id, update, { new: true });
    if (!transporter) return res.status(404).json({ error: 'Transporter not found' });
    res.json({ message: 'Profile updated', user: transporter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Helper to check if Google account exists in any user type
async function findUserByGoogleUidOrEmail(googleUid, googleEmail) {
  let user = await Farmer.findOne({ $or: [ { googleUid }, { googleEmail } ] });
  if (user) return { user, role: 'farmer' };
  user = await Retailer.findOne({ $or: [ { googleUid }, { googleEmail } ] });
  if (user) return { user, role: 'retailer' };
  user = await Transporter.findOne({ $or: [ { googleUid }, { googleEmail } ] });
  if (user) return { user, role: 'transporter' };
  return null;
}

// Google Registration
exports.googleRegister = async (req, res) => {
  try {
    const { name, email, uid, photoURL, role, location, vehicleType } = req.body;
    if (!name || !email || !uid || !role || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Check if Google account already registered as any user type
    const found = await findUserByGoogleUidOrEmail(uid, email);
    if (found) {
      return res.status(400).json({ error: 'Google account already registered as ' + found.role });
    }
    let user;
    if (role === 'farmer') {
      user = await Farmer.create({ name, location, googleUid: uid, googleEmail: email, photoURL, phone: '' });
    } else if (role === 'retailer') {
      user = await Retailer.create({ name, location, googleUid: uid, googleEmail: email, photoURL, phone: '' });
    } else if (role === 'transporter') {
      user = await Transporter.create({ name, location, vehicleType, googleUid: uid, googleEmail: email, photoURL, phone: '' });
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }
    res.status(201).json({ message: 'Registered with Google', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Google Login
exports.googleLogin = async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid && !email) {
      return res.status(400).json({ error: 'Google UID or email required' });
    }
    const found = await findUserByGoogleUidOrEmail(uid, email);
    if (!found) {
      return res.status(404).json({ error: 'Google account not registered' });
    }
    res.json({ message: 'Google login successful', user: found.user, role: found.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
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
    const { upiId, upiQr, phone, name, photoURL, location } = req.body;
    const update = {};
    if (upiId !== undefined) update.upiId = upiId.trim();
    if (upiQr !== undefined) update.upiQr = upiQr;
    if (phone !== undefined) update.phone = phone;
    if (name !== undefined) update.name = name;
    if (photoURL !== undefined) update.photoURL = photoURL;
    if (location !== undefined) update.location = location;
    const farmer = await Farmer.findByIdAndUpdate(id, update, { new: true });
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });
    res.json({ message: 'Profile updated', user: farmer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.registerFarmer = async (req, res) => {
  try {
    const { name, phone, location, email, uid, photoURL } = req.body;
    if (!name || !location) {
      return res.status(400).json({ error: 'name and location are required' });
    }
    // Must have either phone or (email and uid)
    if ((!phone || phone === '') && (!email || !uid)) {
      return res.status(400).json({ error: 'Either phone or email+uid is required' });
    }
    let existing;
    if (phone && phone !== '') {
      existing = await Farmer.findOne({ phone });
    } else if (email && uid) {
      existing = await Farmer.findOne({ googleEmail: email, googleUid: uid });
    }
    if (existing) return res.json({ message: 'Already registered', user: existing });

    const farmerData = { name, location };
    if (phone && phone !== '') farmerData.phone = phone;
    if (email) farmerData.googleEmail = email;
    if (uid) farmerData.googleUid = uid;
    if (photoURL) farmerData.photoURL = photoURL;
    const farmer = await Farmer.create(farmerData);
    res.status(201).json({ message: 'Farmer registered', user: farmer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.registerRetailer = async (req, res) => {
  try {
    const { name, phone, location, email, uid, photoURL } = req.body;
    if (!name || !location) {
      return res.status(400).json({ error: 'name and location are required' });
    }
    if ((!phone || phone === '') && (!email || !uid)) {
      return res.status(400).json({ error: 'Either phone or email+uid is required' });
    }
    let existing;
    if (phone && phone !== '') {
      existing = await Retailer.findOne({ phone });
    } else if (email && uid) {
      existing = await Retailer.findOne({ googleEmail: email, googleUid: uid });
    }
    if (existing) return res.json({ message: 'Already registered', user: existing });

    const retailerData = { name, location };
    if (phone && phone !== '') retailerData.phone = phone;
    if (email) retailerData.googleEmail = email;
    if (uid) retailerData.googleUid = uid;
    if (photoURL) retailerData.photoURL = photoURL;
    const retailer = await Retailer.create(retailerData);
    res.status(201).json({ message: 'Retailer registered', user: retailer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.registerTransporter = async (req, res) => {
  try {
    const { name, phone, location, vehicleType, email, uid, photoURL } = req.body;
    if (!name || !location) {
      return res.status(400).json({ error: 'name and location are required' });
    }
    if ((!phone || phone === '') && (!email || !uid)) {
      return res.status(400).json({ error: 'Either phone or email+uid is required' });
    }
    let existing;
    if (phone && phone !== '') {
      existing = await Transporter.findOne({ phone });
    } else if (email && uid) {
      existing = await Transporter.findOne({ googleEmail: email, googleUid: uid });
    }
    if (existing) return res.json({ message: 'Already registered', user: existing });

    const transporterData = { name, location, vehicleType };
    if (phone && phone !== '') transporterData.phone = phone;
    if (email) transporterData.googleEmail = email;
    if (uid) transporterData.googleUid = uid;
    if (photoURL) transporterData.photoURL = photoURL;
    const transporter = await Transporter.create(transporterData);
    res.status(201).json({ message: 'Transporter registered', user: transporter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, role, uid, email } = req.body;
    let user = null;
    let foundRole = role;
    // Login by phone (OTP flow)
    if (phone && role) {
      if (role === 'farmer') user = await Farmer.findOne({ phone });
      else if (role === 'retailer') user = await Retailer.findOne({ phone });
      else if (role === 'transporter') user = await Transporter.findOne({ phone });
      else return res.status(400).json({ error: 'Invalid role' });
    }
    // Login by uid/email (email/password or Google)
    else if (uid && email) {
      // Try to find user in all roles
      let found = await Farmer.findOne({ googleUid: uid, googleEmail: email });
      if (found) { user = found; foundRole = 'farmer'; }
      if (!user) {
        found = await Retailer.findOne({ googleUid: uid, googleEmail: email });
        if (found) { user = found; foundRole = 'retailer'; }
      }
      if (!user) {
        found = await Transporter.findOne({ googleUid: uid, googleEmail: email });
        if (found) { user = found; foundRole = 'transporter'; }
      }
      if (!user) return res.status(404).json({ error: 'User not found. Please register.' });
    } else {
      return res.status(400).json({ error: 'phone+role or uid+email required' });
    }
    if (!user) return res.status(404).json({ error: 'User not found. Please register.' });
    res.json({ message: 'Login successful', user, role: foundRole });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
