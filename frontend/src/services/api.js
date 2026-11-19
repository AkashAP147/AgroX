import { db } from './firebase';
import { ref, set, get, update, remove, push } from 'firebase/database';

// Helper to convert Firebase snapshot object to array with _id and id
function snapshotToArray(snapshot) {
  if (!snapshot || !snapshot.exists()) return [];
  const val = snapshot.val();
  return Object.keys(val).map(key => ({
    _id: key,
    id: key,
    ...val[key]
  }));
}

// Haversine formula for distance calculation in km
function haversineDistanceKm(a, b) {
  if (!a || !b || typeof a.lat !== 'number' || typeof a.lng !== 'number' || typeof b.lat !== 'number' || typeof b.lng !== 'number') return null;
  const R = 6371;
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLon = (b.lng - a.lng) * (Math.PI / 180);
  const lat1 = a.lat * (Math.PI / 180);
  const lat2 = b.lat * (Math.PI / 180);
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

// Helper to remove any undefined properties so Firebase RTDB never throws
function sanitizeData(obj) {
  if (obj === undefined) return null;
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeData);
  const clean = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      clean[key] = typeof val === 'object' && val !== null ? sanitizeData(val) : val;
    }
  }
  return clean;
}

// ----------------------------------------------------
// AUTHENTICATION & USERS
// ----------------------------------------------------

export async function googleRegister(data) {
  const { name, email, uid, photoURL, role, location, vehicleType, phone } = data;
  if (!uid) throw new Error('User UID is required');

  const userSnap = await get(ref(db, `users/${uid}`));
  if (userSnap.exists()) {
    const existing = { _id: uid, id: uid, ...userSnap.val() };
    return { message: 'Already registered', user: existing, role: existing.role };
  }

  const userObj = {
    _id: uid,
    id: uid,
    name: name || 'User',
    email: email || '',
    googleEmail: email || '',
    googleUid: uid,
    photoURL: photoURL || '',
    role: role || 'farmer',
    location: location || '',
    phone: phone || '',
    vehicleType: vehicleType || '',
    averageRating: 5,
    totalRatings: 0,
    createdAt: new Date().toISOString()
  };

  await set(ref(db, `users/${uid}`), sanitizeData(userObj));
  return { message: 'Registered with Google', user: userObj, role: userObj.role };
}

export async function googleLogin(data) {
  const { uid, email } = data;
  if (!uid && !email) throw new Error('UID or email required');

  if (uid) {
    const snap = await get(ref(db, `users/${uid}`));
    if (snap.exists()) {
      const user = { _id: uid, id: uid, ...snap.val() };
      return { message: 'Google login successful', user, role: user.role };
    }
  }

  const allUsersSnap = await get(ref(db, 'users'));
  if (allUsersSnap.exists()) {
    const users = allUsersSnap.val();
    for (const key of Object.keys(users)) {
      const u = users[key];
      if ((uid && (u.googleUid === uid || key === uid)) || (email && (u.email === email || u.googleEmail === email))) {
        const user = { _id: key, id: key, ...u };
        return { message: 'Google login successful', user, role: user.role };
      }
    }
  }

  throw new Error('Google account not registered. Please register first.');
}

async function registerUserWithRole(data, role) {
  const id = data.uid || push(ref(db, 'users')).key;

  if (data.uid) {
    const snap = await get(ref(db, `users/${data.uid}`));
    if (snap.exists()) {
      const existing = { _id: data.uid, id: data.uid, ...snap.val() };
      return { message: 'Already registered', user: existing, role: existing.role };
    }
  }

  const userObj = {
    _id: id,
    id,
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',
    googleEmail: data.email || '',
    googleUid: data.uid || '',
    photoURL: data.photoURL || '',
    role,
    location: data.location || '',
    vehicleType: data.vehicleType || '',
    averageRating: 5,
    totalRatings: 0,
    createdAt: new Date().toISOString()
  };

  await set(ref(db, `users/${id}`), sanitizeData(userObj));
  return { message: `${role} registered`, user: userObj, role };
}

export const registerFarmer = (data) => registerUserWithRole(data, 'farmer');
export const registerRetailer = (data) => registerUserWithRole(data, 'retailer');
export const registerTransporter = (data) => registerUserWithRole(data, 'transporter');

export async function login(data) {
  const { phone, role, uid, email } = data;

  if (uid) {
    const snap = await get(ref(db, `users/${uid}`));
    if (snap.exists()) {
      const user = { _id: uid, id: uid, ...snap.val() };
      return { message: 'Login successful', user, role: user.role };
    }
  }

  const allUsersSnap = await get(ref(db, 'users'));
  if (!allUsersSnap.exists()) {
    throw new Error('User not found. Please register.');
  }

  const users = allUsersSnap.val();
  for (const key of Object.keys(users)) {
    const u = users[key];
    if (phone && role && u.phone === phone && u.role === role) {
      const user = { _id: key, id: key, ...u };
      return { message: 'Login successful', user, role: user.role };
    }
    if (uid && email && (u.googleUid === uid || u.email === email || u.googleEmail === email)) {
      const user = { _id: key, id: key, ...u };
      return { message: 'Login successful', user, role: user.role };
    }
  }

  throw new Error('User not found. Please register.');
}

export async function updateFarmerProfile(id, data) {
  await update(ref(db, `users/${id}`), sanitizeData(data));
  const snap = await get(ref(db, `users/${id}`));
  const user = { _id: id, id, ...snap.val() };
  return { message: 'Profile updated', user };
}

export async function updateTransporterProfile(id, data) {
  await update(ref(db, `users/${id}`), sanitizeData(data));
  const snap = await get(ref(db, `users/${id}`));
  const user = { _id: id, id, ...snap.val() };
  return { message: 'Profile updated', user };
}

export async function updateRetailerProfile(id, data) {
  await update(ref(db, `users/${id}`), sanitizeData(data));
  const snap = await get(ref(db, `users/${id}`));
  const user = { _id: id, id, ...snap.val() };
  return { message: 'Profile updated', user };
}

// ----------------------------------------------------
// CROPS
// ----------------------------------------------------

export async function addCrop(data) {
  const cropId = push(ref(db, 'crops')).key;
  const crop = {
    _id: cropId,
    id: cropId,
    cropName: data.cropName || '',
    quantity: Number(data.quantity) || 0,
    quantityUnit: data.quantityUnit || 'kg',
    price: Number(data.price) || 0,
    farmerId: data.farmerId || '',
    farmerName: data.farmerName || '',
    location: data.location || '',
    availableUntil: data.availableUntil || new Date(Date.now() + 7 * 86400000).toISOString(),
    coordinates: data.coordinates || { lat: 20.5937, lng: 78.9629 },
    image: data.image || null,
    status: 'available',
    createdAt: new Date().toISOString()
  };
  await set(ref(db, `crops/${cropId}`), sanitizeData(crop));
  return { message: 'Crop added', crop };
}

export async function getFarmerCrops(farmerId) {
  const snap = await get(ref(db, 'crops'));
  const crops = snapshotToArray(snap);
  return crops
    .filter(c => c.farmerId === farmerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function deleteCrop(cropId) {
  await remove(ref(db, `crops/${cropId}`));
  return { message: 'Crop deleted' };
}

export async function updateCrop(cropId, data) {
  await update(ref(db, `crops/${cropId}`), sanitizeData(data));
  const snap = await get(ref(db, `crops/${cropId}`));
  return { message: 'Crop updated', crop: { _id: cropId, id: cropId, ...snap.val() } };
}

export async function getAllCrops() {
  const snap = await get(ref(db, 'crops'));
  return snapshotToArray(snap)
    .filter(c => c.status === 'available')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getRecommendedCrops(retailerId) {
  const retailerSnap = await get(ref(db, `users/${retailerId}`));
  const retailer = retailerSnap.exists() ? retailerSnap.val() : null;
  const snap = await get(ref(db, 'crops'));
  const crops = snapshotToArray(snap).filter(c => c.status === 'available');

  if (!retailer || !retailer.coordinates) return crops;

  return crops
    .map(crop => {
      if (!crop.coordinates) return null;
      const dist = haversineDistanceKm(retailer.coordinates, crop.coordinates);
      return dist !== null && dist <= 100 ? { ...crop, distanceKm: dist } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function getMarketplaceCrops(params = {}) {
  const snap = await get(ref(db, 'crops'));
  let crops = snapshotToArray(snap).filter(c => c.status === 'available');

  const { cropName, minPrice, maxPrice, location, retailerLat, retailerLng } = params;

  if (cropName) {
    crops = crops.filter(c => c.cropName?.toLowerCase().includes(cropName.toLowerCase()));
  }
  if (location) {
    crops = crops.filter(c => c.location?.toLowerCase().includes(location.toLowerCase()));
  }
  if (minPrice) {
    crops = crops.filter(c => Number(c.price) >= Number(minPrice));
  }
  if (maxPrice) {
    crops = crops.filter(c => Number(c.price) <= Number(maxPrice));
  }

  if (retailerLat && retailerLng) {
    const retailerCoords = { lat: Number(retailerLat), lng: Number(retailerLng) };
    crops = crops
      .map(c => {
        const dist = haversineDistanceKm(retailerCoords, c.coordinates);
        return dist !== null ? { ...c, distanceKm: dist } : c;
      })
      .sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));
  } else {
    crops.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return crops;
}

export async function syncCrops(crops) {
  for (const c of crops) {
    await addCrop(c);
  }
  return { message: 'Crops synced' };
}

// ----------------------------------------------------
// ORDERS
// ----------------------------------------------------

export async function createOrder(data) {
  const { cropId, retailerId, retailerName, quantity, dropLocation, dropCoordinates } = data;

  const cropSnap = await get(ref(db, `crops/${cropId}`));
  if (!cropSnap.exists()) throw new Error('Crop not found');
  const crop = cropSnap.val();

  const orderId = push(ref(db, 'orders')).key;
  const totalPrice = Number(quantity) * Number(crop.price || 0);
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const order = {
    _id: orderId,
    id: orderId,
    cropId,
    farmerId: crop.farmerId,
    retailerId,
    retailerName: retailerName || 'Retailer',
    cropName: crop.cropName,
    quantity: Number(quantity),
    totalPrice,
    pickupLocation: crop.location,
    dropLocation: dropLocation || 'Retailer Warehouse',
    dropCoordinates: dropCoordinates || null,
    status: 'accepted',
    paymentStatus: 'pending',
    otp,
    createdAt: new Date().toISOString()
  };

  const newQty = Math.max(0, (crop.quantity || 0) - Number(quantity));
  await update(ref(db, `crops/${cropId}`), sanitizeData({
    quantity: newQty,
    status: newQty <= 0 ? 'sold' : 'available'
  }));

  await set(ref(db, `orders/${orderId}`), sanitizeData(order));

  const deliveryId = push(ref(db, 'deliveries')).key;
  const delivery = {
    _id: deliveryId,
    id: deliveryId,
    orderId,
    cropName: crop.cropName,
    quantity: Number(quantity),
    pickupLocation: crop.location,
    pickupCoordinates: crop.coordinates || null,
    dropLocation: dropLocation || 'Retailer Warehouse',
    dropCoordinates: dropCoordinates || null,
    deliveryStatus: 'pending',
    createdAt: new Date().toISOString()
  };
  await set(ref(db, `deliveries/${deliveryId}`), sanitizeData(delivery));

  return { message: 'Order created', order };
}

export async function getFarmerOrders(farmerId) {
  const snap = await get(ref(db, 'orders'));
  return snapshotToArray(snap)
    .filter(o => o.farmerId === farmerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getRetailerOrders(retailerId) {
  const snap = await get(ref(db, 'orders'));
  return snapshotToArray(snap)
    .filter(o => o.retailerId === retailerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function updateOrderStatus(orderId, status) {
  await update(ref(db, `orders/${orderId}`), sanitizeData({ status }));

  if (status === 'delivered') {
    const deliveriesSnap = await get(ref(db, 'deliveries'));
    const deliveries = snapshotToArray(deliveriesSnap);
    const del = deliveries.find(d => d.orderId === orderId);
    if (del) {
      await update(ref(db, `deliveries/${del._id}`), sanitizeData({ deliveryStatus: 'delivered' }));
    }
  }
  return { message: 'Order status updated' };
}

export async function payOrder(orderId, upiId) {
  await update(ref(db, `orders/${orderId}`), sanitizeData({ paymentStatus: 'completed', upiId }));
  return { message: 'Payment recorded' };
}

export async function getOrderDetails(orderId) {
  const snap = await get(ref(db, `orders/${orderId}`));
  if (!snap.exists()) throw new Error('Order not found');
  return { _id: orderId, id: orderId, ...snap.val() };
}

export async function verifyDeliveryOtp(orderId, otp) {
  const snap = await get(ref(db, `orders/${orderId}`));
  if (!snap.exists()) throw new Error('Order not found');
  const order = snap.val();
  if (order.otp !== String(otp)) throw new Error('Invalid OTP');

  await update(ref(db, `orders/${orderId}`), sanitizeData({ status: 'delivered' }));
  const deliveriesSnap = await get(ref(db, 'deliveries'));
  const del = snapshotToArray(deliveriesSnap).find(d => d.orderId === orderId);
  if (del) {
    await update(ref(db, `deliveries/${del._id}`), sanitizeData({ deliveryStatus: 'delivered' }));
  }
  return { message: 'Delivery confirmed', order: { _id: orderId, id: orderId, ...order, status: 'delivered' } };
}

// ----------------------------------------------------
// DELIVERIES
// ----------------------------------------------------

export async function getPendingDeliveries() {
  const snap = await get(ref(db, 'deliveries'));
  return snapshotToArray(snap)
    .filter(d => d.deliveryStatus === 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getTransporterDeliveries(transporterId) {
  const snap = await get(ref(db, 'deliveries'));
  return snapshotToArray(snap)
    .filter(d => d.transporterId === transporterId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function acceptDelivery(deliveryId, data) {
  await update(ref(db, `deliveries/${deliveryId}`), sanitizeData({
    transporterId: data.transporterId,
    transporterName: data.transporterName,
    deliveryStatus: 'accepted'
  }));
  const delSnap = await get(ref(db, `deliveries/${deliveryId}`));
  if (delSnap.exists() && delSnap.val().orderId) {
    await update(ref(db, `orders/${delSnap.val().orderId}`), sanitizeData({ status: 'in_transit' }));
  }
  return { message: 'Delivery accepted' };
}

export async function updateDeliveryStatus(deliveryId, data) {
  await update(ref(db, `deliveries/${deliveryId}`), sanitizeData({
    deliveryStatus: data.status,
    ...(data.location ? { transporterLocation: data.location } : {})
  }));
  if (data.status === 'delivered') {
    const delSnap = await get(ref(db, `deliveries/${deliveryId}`));
    if (delSnap.exists() && delSnap.val().orderId) {
      await update(ref(db, `orders/${delSnap.val().orderId}`), sanitizeData({ status: 'delivered' }));
    }
  }
  return { message: 'Delivery status updated' };
}

// ----------------------------------------------------
// RATINGS
// ----------------------------------------------------

export async function submitRating(data) {
  const ratingId = push(ref(db, 'ratings')).key;
  const rating = {
    _id: ratingId,
    id: ratingId,
    ...data,
    createdAt: new Date().toISOString()
  };
  await set(ref(db, `ratings/${ratingId}`), sanitizeData(rating));
  return { message: 'Rating submitted', rating };
}

export async function getFarmerRatings(farmerId) {
  const snap = await get(ref(db, 'ratings'));
  return snapshotToArray(snap).filter(r => r.farmerId === farmerId);
}

export async function getRetailerRatings(retailerId) {
  const snap = await get(ref(db, 'ratings'));
  return snapshotToArray(snap).filter(r => r.retailerId === retailerId);
}
