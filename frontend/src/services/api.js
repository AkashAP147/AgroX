// Retailer Crops
export const getRecommendedCrops = (retailerId) => request(`/crops/recommended/${retailerId}`);
export const getAllCrops = () => request('/crops/all');
export const verifyDeliveryOtp = (orderId, otp) => request(`/orders/${orderId}/verify-otp`, { method: 'POST', body: { otp } });
// Google Auth
export const googleRegister = (data) => request('/auth/google/register', { method: 'POST', body: data });
export const googleLogin = (data) => request('/auth/google/login', { method: 'POST', body: data });
const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(url, options = {}) {
  // Ensure all API routes are prefixed with /api
  let fullUrl = API_BASE + url;
  if (!fullUrl.includes('/api/')) {
    fullUrl = API_BASE + '/api' + url;
  }
  const res = await fetch(fullUrl, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Auth
// Removed backend OTP endpoints; use Firebase only
export const registerFarmer = (data) => request('/auth/register/farmer', { method: 'POST', body: data });
export const registerRetailer = (data) => request('/auth/register/retailer', { method: 'POST', body: data });
export const registerTransporter = (data) => request('/auth/register/transporter', { method: 'POST', body: data });
export const login = (data) => request('/auth/login', { method: 'POST', body: data });


export const updateFarmerProfile = (id, data) => request(`/auth/profile/farmer/${id}`, { method: 'PUT', body: data });
export const updateTransporterProfile = (id, data) => request(`/auth/profile/transporter/${id}`, { method: 'PUT', body: data });
export const updateRetailerProfile = (id, data) => request(`/auth/profile/retailer/${id}`, { method: 'PUT', body: data });

// Crops
export const addCrop = (data) => request('/crops/add', { method: 'POST', body: data });
export const getFarmerCrops = (farmerId) => request(`/crops/farmer/${farmerId}`);
export const deleteCrop = (cropId) => request(`/crops/${cropId}`, { method: 'DELETE' });
export const getMarketplaceCrops = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request(`/crops/marketplace${q ? '?' + q : ''}`);
};
export const syncCrops = (crops) => request('/crops/sync', { method: 'POST', body: { crops } });
export const updateCrop = (cropId, data) => request(`/crops/${cropId}`, { method: 'PUT', body: data });

// Orders
export const createOrder = (data) => request('/orders/create', { method: 'POST', body: data });
export const getFarmerOrders = (farmerId) => request(`/orders/farmer/${farmerId}`);
export const getRetailerOrders = (retailerId) => request(`/orders/retailer/${retailerId}`);
export const updateOrderStatus = (orderId, status) => request(`/orders/${orderId}/status`, { method: 'PUT', body: { status } });
export const payOrder = (orderId, upiId) => request(`/orders/${orderId}/pay`, { method: 'POST', body: { upiId } });
export const getOrderDetails = (orderId) => request(`/orders/${orderId}/details`);

// Deliveries
export const getPendingDeliveries = () => request('/deliveries/pending');
export const getTransporterDeliveries = (transporterId) => request(`/deliveries/transporter/${transporterId}`);
export const acceptDelivery = (deliveryId, data) => request(`/deliveries/${deliveryId}/accept`, { method: 'PUT', body: data });
export const updateDeliveryStatus = (deliveryId, status) => request(`/deliveries/${deliveryId}/status`, { method: 'PUT', body: { status } });

// Ratings
export const submitRating = (data) => request('/ratings', { method: 'POST', body: data });
export const getFarmerRatings = (farmerId) => request(`/ratings/farmer/${farmerId}`);
export const getRetailerRatings = (retailerId) => request(`/ratings/retailer/${retailerId}`);
