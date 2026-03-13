const mongoose = require('mongoose');

const retailerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, match: /^[0-9]{10}$/ },
  location: { type: String, required: true, trim: true },
  role: { type: String, default: 'retailer' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Retailer', retailerSchema);
