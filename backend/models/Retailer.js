const mongoose = require('mongoose');

const retailerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, unique: true, sparse: true, match: /^[0-9]{10}$/ },
  location: { type: String, required: true, trim: true },
  photoURL: { type: String, default: '' }, // profile picture (base64 or URL)
  role: { type: String, default: 'retailer' },
  googleUid: { type: String, default: '', index: true },
  googleEmail: { type: String, default: '', index: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Retailer', retailerSchema);
