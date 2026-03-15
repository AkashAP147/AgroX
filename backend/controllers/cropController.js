const Crop = require('../models/Crop');
const Farmer = require('../models/Farmer');

exports.addCrop = async (req, res) => {
  try {
    const { cropName, quantity, quantityUnit, price, farmerId, farmerName, location, availableUntil, coordinates, image } = req.body;
    if (!cropName || !quantity || !price || !farmerId || !location || !availableUntil) {
      return res.status(400).json({ error: 'All crop fields are required' });
    }
    const crop = await Crop.create({
      cropName, quantity, quantityUnit: quantityUnit || 'kg', price, farmerId, farmerName,
      location, availableUntil,
      coordinates: coordinates || { lat: 20.5937, lng: 78.9629 },
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
    const { cropName, minPrice, maxPrice, location } = req.query;
    const filter = { status: 'available', availableUntil: { $gte: new Date() } };
    if (cropName) filter.cropName = new RegExp('^' + cropName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (location) filter.location = new RegExp('^' + location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    const crops = await Crop.find(filter).sort({ createdAt: -1 }).lean();

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
