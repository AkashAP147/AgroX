// Update a crop by ID (price, quantity, etc)
exports.updateCrop = async (req, res) => {
  try {
    const { cropId } = req.params;
    if (!cropId) return res.status(400).json({ error: 'Crop ID required' });
    const update = {};
    if (req.body.price !== undefined) update.price = req.body.price;
    if (req.body.quantity !== undefined) update.quantity = req.body.quantity;
    // Optionally allow updating other fields
    const updated = await Crop.findByIdAndUpdate(cropId, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Crop not found' });
    res.json({ message: 'Crop updated', crop: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Delete a crop by ID
exports.deleteCrop = async (req, res) => {
  try {
    const { cropId } = req.params;
    if (!cropId) return res.status(400).json({ error: 'Crop ID required' });
    const deleted = await Crop.findByIdAndDelete(cropId);
    if (!deleted) return res.status(404).json({ error: 'Crop not found' });
    res.json({ message: 'Crop deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Get recommended crops for a retailer (simple: crops in same location as retailer, or by some logic)
exports.getRecommendedCrops = async (req, res) => {
  try {
    const { retailerId } = req.params;
    if (!retailerId) return res.status(400).json({ error: 'Retailer ID required' });
    // Find retailer location and coordinates
    const Retailer = require('../models/Retailer');
    const retailer = await Retailer.findById(retailerId);
    if (!retailer) return res.status(404).json({ error: 'Retailer not found' });
    if (!retailer.coordinates || typeof retailer.coordinates.lat !== 'number' || typeof retailer.coordinates.lng !== 'number') {
      return res.status(400).json({ error: 'Retailer coordinates not set' });
    }
    // Get all available crops
    const crops = await Crop.find({ status: 'available', availableUntil: { $gte: new Date() } }).lean();
    // Haversine formula
    function haversineDistanceKm(a, b) {
      const R = 6371;
      const dLat = (b.lat - a.lat) * (Math.PI / 180);
      const dLon = (b.lng - a.lng) * (Math.PI / 180);
      const lat1 = a.lat * (Math.PI / 180);
      const lat2 = b.lat * (Math.PI / 180);
      const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
      return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
    }
    // Filter crops within 100km and attach distance (using crop coordinates)
    const recommended = crops
      .map(crop => {
        if (!crop.coordinates || typeof crop.coordinates.lat !== 'number' || typeof crop.coordinates.lng !== 'number') return null;
        const dist = haversineDistanceKm(retailer.coordinates, crop.coordinates);
        return dist <= 100 ? { ...crop, distanceKm: dist } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    res.json(recommended);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all available crops (for retailer)
exports.getAllCropsForRetailer = async (req, res) => {
  try {
    const crops = await Crop.find({ status: 'available', availableUntil: { $gte: new Date() } }).sort({ createdAt: -1 }).lean();
    res.json(crops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const Crop = require('../models/Crop');
const Farmer = require('../models/Farmer');

exports.addCrop = async (req, res) => {
  try {
    const { cropName, quantity, quantityUnit, price, farmerId, farmerName, location, availableUntil, coordinates, image } = req.body;
    if (!cropName || !quantity || !price || !farmerId || !location || !availableUntil) {
      return res.status(400).json({ error: 'All crop fields are required' });
    }
    // Prevent duplicate crop listing for same farmer, crop, location, and availableUntil
    const existing = await Crop.findOne({
      cropName: { $regex: new RegExp('^' + cropName + '$', 'i') },
      farmerId,
      location: { $regex: new RegExp('^' + location + '$', 'i') },
      availableUntil: new Date(availableUntil),
      status: 'available'
    });
    if (existing) {
      return res.status(409).json({ error: 'This crop is already listed and available.' });
    }

    // Determine coordinates: use provided coords, or fallback to farmer's most recent crop coords
    let cropCoords = coordinates;
    if (!cropCoords || typeof cropCoords.lat !== 'number' || typeof cropCoords.lng !== 'number') {
      const latestCrop = await Crop.findOne({ farmerId, 'coordinates.lat': { $ne: 20.5937 } })
        .sort({ createdAt: -1 }).lean();
      if (latestCrop && latestCrop.coordinates) {
        cropCoords = latestCrop.coordinates;
      } else {
        cropCoords = null; // No valid fallback available
      }
    }

    const crop = await Crop.create({
      cropName, quantity, quantityUnit: quantityUnit || 'kg', price, farmerId, farmerName,
      location, availableUntil,
      coordinates: cropCoords || { lat: 20.5937, lng: 78.9629 },
      image: image || null
    });
    res.status(201).json({ message: 'Crop added', crop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFarmerCrops = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const crops = await Crop.find({ farmerId }).sort({ createdAt: -1 });
    res.json(crops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllCrops = async (req, res) => {
  try {
    const { cropName, minPrice, maxPrice, location, retailerLat, retailerLng } = req.query;
    const filter = { status: 'available', availableUntil: { $gte: new Date() } };
    if (cropName) filter.cropName = new RegExp('^' + cropName.replace(/[.*+?^${}()|[\]\\]/g, '\$&'), 'i');
    if (location) filter.location = new RegExp('^' + location.replace(/[.*+?^${}()|[\]\\]/g, '\$&'), 'i');
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    let crops = await Crop.find(filter).sort({ createdAt: -1 }).lean();

    // Attach farmer rating data
    const farmerIds = [...new Set(crops.map(c => c.farmerId?.toString()).filter(Boolean))];
    const farmers = await Farmer.find({ _id: { $in: farmerIds } }, 'averageRating totalRatings').lean();
    const farmerMap = {};
    farmers.forEach(f => { farmerMap[f._id.toString()] = f; });
    crops.forEach(c => {
      const f = farmerMap[c.farmerId?.toString()];
      c.farmerRating = f?.averageRating || 0;
      c.farmerTotalRatings = f?.totalRatings || 0;
    });

    // If retailer coordinates are provided, filter and sort by distance using crop coordinates
    if (retailerLat && retailerLng) {
      function haversineDistanceKm(a, b) {
        const R = 6371;
        const dLat = (b.lat - a.lat) * (Math.PI / 180);
        const dLon = (b.lng - a.lng) * (Math.PI / 180);
        const lat1 = a.lat * (Math.PI / 180);
        const lat2 = b.lat * (Math.PI / 180);
        const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
      }
      const coords = { lat: parseFloat(retailerLat), lng: parseFloat(retailerLng) };
      crops = crops
        .map(crop => {
          if (!crop.coordinates || typeof crop.coordinates.lat !== 'number' || typeof crop.coordinates.lng !== 'number') return null;
          const dist = haversineDistanceKm(coords, crop.coordinates);
          return dist <= 100 ? { ...crop, distanceKm: dist } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }
    res.json(crops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.syncCrops = async (req, res) => {
  try {
    const { crops } = req.body;
    if (!Array.isArray(crops) || crops.length === 0) {
      return res.status(400).json({ error: 'crops array is required' });
    }
    const results = [];
    for (const c of crops) {
      if (!c.cropName || !c.quantity || !c.price || !c.farmerId || !c.location || !c.availableUntil) continue;
      const crop = await Crop.create({
        cropName: c.cropName, quantity: c.quantity, quantityUnit: c.quantityUnit || 'kg', price: c.price,
        farmerId: c.farmerId, farmerName: c.farmerName,
        location: c.location, availableUntil: c.availableUntil,
        coordinates: c.coordinates || { lat: 20.5937, lng: 78.9629 },
        image: c.image || null
      });
      results.push(crop);
    }
    res.status(201).json({ message: `${results.length} crops synced`, crops: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
