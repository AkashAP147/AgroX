const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  cropId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', required: true },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer', required: true },
  retailerName: { type: String, trim: true },
  cropName: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  totalPrice: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'paid', 'shipped', 'delivered'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid'
  },
  farmerPayout: { type: Number, default: 0 },
  transporterPayout: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  transactionId: { type: String },
  paidVia: { type: String },
  paidAt: { type: Date },
  pickupLocation: { type: String },
  dropLocation: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
