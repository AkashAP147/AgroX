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
    const { status, pickupOtp } = req.body;
    const valid = ['pending', 'accepted', 'in-transit', 'delivered'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    // If moving to in-transit, require OTP from farmer
    if (status === 'in-transit') {
      // If no pickupOtp exists, generate and save it (should be sent to farmer)
      if (!delivery.pickupOtp) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        delivery.pickupOtp = otp;
        await delivery.save();
        return res.status(200).json({ message: 'Pickup OTP generated. Share with farmer.', pickupOtp: otp });
      }
      // If pickupOtp exists, require it from transporter
      if (!pickupOtp) {
        return res.status(400).json({ error: 'Pickup OTP required from farmer.' });
      }
      if (pickupOtp !== delivery.pickupOtp) {
        return res.status(400).json({ error: 'Invalid Pickup OTP.' });
      }
      delivery.deliveryStatus = 'in-transit';
      await delivery.save();
      return res.json({ message: 'Transit started', delivery });
    }

    // If moving to delivered, update order as well
    if (status === 'delivered') {
      delivery.deliveryStatus = 'delivered';
      await delivery.save();
      await Order.findByIdAndUpdate(delivery.orderId, { status: 'delivered' });
      return res.json({ message: 'Delivery updated', delivery });
    }

    // For other statuses
    delivery.deliveryStatus = status;
    await delivery.save();
    res.json({ message: 'Delivery updated', delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
