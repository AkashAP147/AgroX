import React, { useState } from 'react';
import { updateRetailerProfile } from '../services/api';
import { MapPin } from 'lucide-react';

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const name = addr.village || addr.town || addr.city || addr.suburb || addr.county ||
      data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    return name.trim();
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export default function RetailerDashboard({ user, onUpdateUser }) {
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Function to update live location (same as FarmerDashboard)
  async function handleUpdateLocation() {
    setLocationError('');
    setLocationLoading(true);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        const res = await updateRetailerProfile(user._id, { location: address });
        if (onUpdateUser) onUpdateUser(res.user);
      } catch (err) {
        setLocationError('Failed to update location');
      } finally {
        setLocationLoading(false);
      }
    }, (err) => {
      setLocationError('Unable to retrieve your location');
      setLocationLoading(false);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 });
  }

  return (
    <div className="card-static p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Retailer Dashboard</h2>
      <div className="mb-6">
        <label className="label">Live Location</label>
        <div className="flex items-center gap-2 mt-1">
          <button
            className="page-subtitle flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-1 py-0.5"
            onClick={handleUpdateLocation}
            disabled={locationLoading}
            title="Click to update location"
            style={{ background: 'none', border: 'none' }}
          >
            {locationLoading ? (
              <>
                <span className="animate-spin"><svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg></span>
                <span className="ml-1">{user.location || 'Not set'}</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="ml-1">{user.location || 'Not set'}</span>
              </>
            )}
          </button>
        </div>
        {locationError && <p className="text-xs text-red-600 mt-1">{locationError}</p>}
      </div>
      {/* ...other dashboard content... */}
    </div>
  );
}
