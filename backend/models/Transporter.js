const mongoose = require('mongoose');

const transporterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, unique: true, sparse: true, match: /^[0-9]{10}$/ },
  vehicleType: { type: String, default: 'truck' },
  location: { type: String, required: true, trim: true },
  role: { type: String, default: 'transporter' },
  googleUid: { type: String, default: '', index: true },
  googleEmail: { type: String, default: '', index: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transporter', transporterSchema);
