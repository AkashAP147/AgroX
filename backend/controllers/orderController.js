const Order = require('../models/Order');
const Crop = require('../models/Crop');
const Delivery = require('../models/Delivery');
const Farmer = require('../models/Farmer');
const Retailer = require('../models/Retailer');

exports.createOrder = async (req, res) => {
  try {
    const { cropId, retailerId, retailerName, quantity, dropLocation, dropCoordinates } = req.body;
    if (!cropId || !retailerId || !quantity) {
      return res.status(400).json({ error: 'cropId, retailerId, and quantity are required' });
    }
    if (!dropCoordinates || typeof dropCoordinates.lat !== 'number' || typeof dropCoordinates.lng !== 'number') {
      return res.status(400).json({ error: 'Exact delivery coordinates are required' });
    }
    const crop = await Crop.findById(cropId);
    if (!crop) return res.status(404).json({ error: 'Crop not found' });
    if (crop.status !== 'available') return res.status(400).json({ error: 'Crop not available' });
    if (quantity > crop.quantity) return res.status(400).json({ error: 'Insufficient quantity' });

    const totalPrice = quantity * crop.price;
    const order = await Order.create({
      cropId, farmerId: crop.farmerId, retailerId, retailerName,
      cropName: crop.cropName, quantity, totalPrice,
      pickupLocation: crop.location,
      dropLocation: dropLocation || 'Retailer Warehouse'
    });

    // Create a delivery entry
    await Delivery.create({
      orderId: order._id,
      pickupLocation: crop.location,
      dropLocation: dropLocation || 'Retailer Warehouse',
      pickupCoordinates: crop.coordinates,
      dropCoordinates
    });

    // Fetch farmer and retailer contact details for notifications
    const farmer = await Farmer.findById(crop.farmerId).select('name phone');
    const retailer = await Retailer.findById(retailerId).select('name phone');

    res.status(201).json({
      message: 'Order placed',
      order,
      farmerPhone: farmer?.phone || null,
      farmerName: farmer?.name || crop.farmerName || null,
      retailerPhone: retailer?.phone || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFarmerOrders = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const orders = await Order.find({ farmerId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRetailerOrders = async (req, res) => {
  try {
    const { retailerId } = req.params;
    const orders = await Order.find({ retailerId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const valid = ['pending', 'accepted', 'rejected', 'paid', 'shipped', 'delivered'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // If rejected, no further action; if accepted, crop quantity reduced
    if (status === 'accepted') {
      const crop = await Crop.findById(order.cropId);
      if (crop) {
        crop.quantity -= order.quantity;
        if (crop.quantity <= 0) crop.status = 'sold';
        await crop.save();
      }
    }
    res.json({ message: 'Order updated', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.payOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { upiId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'accepted') return res.status(400).json({ error: 'Order must be accepted before payment' });

    // Find the linked delivery to get transporter info
    const delivery = await Delivery.findOne({ orderId: order._id });

    // Platform receives payment and splits payouts internally.
    // Retailer pays once; no separate transporter payment needed.
    const farmerPayout = Math.round(order.totalPrice * 0.85);
    const transporterPayout = Math.round(order.totalPrice * 0.10);
    const platformFee = order.totalPrice - farmerPayout - transporterPayout;

    const transactionId = 'TXN' + Date.now();

    order.paymentStatus = 'paid';
    order.status = 'paid';
    order.farmerPayout = farmerPayout;
    order.transporterPayout = transporterPayout;
    order.platformFee = platformFee;
    order.transactionId = transactionId;
    order.paidVia = (typeof upiId === 'string' && upiId.trim()) ? upiId.trim() : 'demo-upi@mandi';
    order.paidAt = new Date();
    await order.save();

    res.json({
      message: 'Payment successful',
      transactionId,
      amount: order.totalPrice,
      farmerPayout,
      transporterPayout,
      platformFee,
      transporterAssigned: !!(delivery && delivery.transporterId),
      order
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const delivery = await Delivery.findOne({ orderId: order._id });
    const farmer = await require('../models/Farmer').findById(order.farmerId);
    const retailer = await require('../models/Retailer').findById(order.retailerId);

    res.json({
      order,
      delivery: delivery || null,
      farmerName: farmer?.name || order.cropName,
      farmerPhone: farmer?.phone || '',
      farmerUpiId: farmer?.upiId || '',
      farmerUpiQr: farmer?.upiQr || '',
      retailerName: retailer?.name || order.retailerName,
      transporterName: delivery?.transporterName || 'Not assigned yet'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
