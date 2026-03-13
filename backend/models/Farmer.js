const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, match: /^[0-9]{10}$/ },
  location: { type: String, required: true, trim: true },
  role: { type: String, default: 'farmer' },
  upiId: { type: String, default: '' },
  upiQr: { type: String, default: '' }, // base64 data URL of QR image
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Farmer', farmerSchema);
