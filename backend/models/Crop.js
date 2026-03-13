const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  cropName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  quantityUnit: { type: String, enum: ['kg', 'quintal', 'ton', 'bag', 'crate'], default: 'kg' },
  price: { type: Number, required: true, min: 0 },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
  farmerName: { type: String, trim: true },
  location: { type: String, required: true, trim: true },
  coordinates: {
    lat: { type: Number, default: 20.5937 },
    lng: { type: Number, default: 78.9629 }
  },
  availableUntil: { type: Date, required: true },
  image: { type: String, default: null },
  status: { type: String, enum: ['available', 'sold'], default: 'available' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Crop', cropSchema);
