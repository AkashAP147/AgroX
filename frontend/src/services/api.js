const API_BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(API_BASE + url, {
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
export const sendOTP = (phone) => request('/auth/send-otp', { method: 'POST', body: { phone } });
export const verifyOTP = (phone, otp) => request('/auth/verify-otp', { method: 'POST', body: { phone, otp } });
export const registerFarmer = (data) => request('/auth/register/farmer', { method: 'POST', body: data });
export const registerRetailer = (data) => request('/auth/register/retailer', { method: 'POST', body: data });
export const registerTransporter = (data) => request('/auth/register/transporter', { method: 'POST', body: data });
export const login = (data) => request('/auth/login', { method: 'POST', body: data });

export const updateFarmerProfile = (id, data) => request(`/auth/profile/farmer/${id}`, { method: 'PUT', body: data });

// Crops
export const addCrop = (data) => request('/crops/add', { method: 'POST', body: data });
export const getFarmerCrops = (farmerId) => request(`/crops/farmer/${farmerId}`);
export const getMarketplaceCrops = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request(`/crops/marketplace${q ? '?' + q : ''}`);
};
export const syncCrops = (crops) => request('/crops/sync', { method: 'POST', body: { crops } });

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
