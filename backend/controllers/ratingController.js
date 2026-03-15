const Rating = require('../models/Rating');
const Farmer = require('../models/Farmer');

// Submit a rating (retailer rates a farmer after payment)
exports.submitRating = async (req, res) => {
  try {
    const { orderId, farmerId, retailerId, rating, comment } = req.body;

    if (!orderId || !farmerId || !retailerId || !rating) {
      return res.status(400).json({ error: 'orderId, farmerId, retailerId, and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if already rated
    const existing = await Rating.findOne({ orderId });
    if (existing) {
      return res.status(409).json({ error: 'You have already rated this order' });
    }

    const newRating = await Rating.create({
      orderId, farmerId, retailerId,
      rating: Math.round(rating),
      comment: comment || ''
    });

    // Recalculate farmer's average rating
    const allRatings = await Rating.find({ farmerId });
    const totalRatings = allRatings.length;
    const averageRating = totalRatings > 0
      ? +(allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
      : 0;

    await Farmer.findByIdAndUpdate(farmerId, { averageRating, totalRatings });

    res.status(201).json({
      message: 'Rating submitted',
      rating: newRating,
      farmerAverage: averageRating,
      farmerTotalRatings: totalRatings
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You have already rated this order' });
    }
    res.status(500).json({ error: err.message });
  }
};

// Get all ratings for a farmer
exports.getFarmerRatings = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const ratings = await Rating.find({ farmerId }).sort({ createdAt: -1 });
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get ratings by retailer (to know which orders are already rated)
exports.getRetailerRatings = async (req, res) => {
  try {
    const { retailerId } = req.params;
    const ratings = await Rating.find({ retailerId }).sort({ createdAt: -1 });
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
