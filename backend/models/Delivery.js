const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transporter' },
  transporterName: { type: String, trim: true },
  pickupLocation: { type: String, required: true },
  dropLocation: { type: String, required: true },
  pickupCoordinates: {
    lat: { type: Number, default: 20.5937 },
    lng: { type: Number, default: 78.9629 }
  },
  dropCoordinates: {
    lat: { type: Number, default: 19.076 },
    lng: { type: Number, default: 72.8777 }
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'accepted', 'in-transit', 'delivered'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Delivery', deliverySchema);
