const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, unique: true, sparse: true, match: /^[0-9]{10}$/ },
  location: { type: String, required: true, trim: true },
  role: { type: String, default: 'farmer' },
  upiId: { type: String, default: '' },
  upiQr: { type: String, default: '' }, // base64 data URL of QR image
  photoURL: { type: String, default: '' }, // profile picture (base64 or URL)
  googleUid: { type: String, default: '', index: true },
  googleEmail: { type: String, default: '', index: true },
  averageRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Farmer', farmerSchema);
