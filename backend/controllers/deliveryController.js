const Delivery = require('../models/Delivery');
const Order = require('../models/Order');

exports.getPendingDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find({ deliveryStatus: 'pending' })
      .populate('orderId')
      .sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTransporterDeliveries = async (req, res) => {
  try {
    const { transporterId } = req.params;
    const deliveries = await Delivery.find({ transporterId })
      .populate('orderId')
      .sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.acceptDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { transporterId, transporterName } = req.body;
    if (!transporterId) return res.status(400).json({ error: 'transporterId required' });

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (delivery.deliveryStatus !== 'pending') return res.status(400).json({ error: 'Already accepted' });

    delivery.transporterId = transporterId;
    delivery.transporterName = transporterName;
    delivery.deliveryStatus = 'accepted';
    await delivery.save();

    // Update order to shipped
    await Order.findByIdAndUpdate(delivery.orderId, { status: 'shipped' });

    res.json({ message: 'Delivery accepted', delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { status } = req.body;
    const valid = ['pending', 'accepted', 'in-transit', 'delivered'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const delivery = await Delivery.findByIdAndUpdate(deliveryId, { deliveryStatus: status }, { new: true });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    if (status === 'delivered') {
      await Order.findByIdAndUpdate(delivery.orderId, { status: 'delivered' });
    }
    res.json({ message: 'Delivery updated', delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
