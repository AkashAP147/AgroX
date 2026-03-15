
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Camera } from 'lucide-react';
// Helper for reverse geocoding
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
import { updateFarmerProfile, updateTransporterProfile, updateRetailerProfile } from '../services/api';


export default function ProfilePage({ user, onUpdateUser }) {
  const navigate = useNavigate();
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [location, setLocation] = useState(user.location || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationHint, setLocationHint] = useState('');
  const fileInputRef = useRef();

  async function detectLiveLocation() {
    if (!navigator.geolocation) {
      setLocationHint("Couldn't detect location");
      return;
    }
    setLocating(true);
    setLocationHint('Detecting location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const name = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setLocation(name);
        setLocationHint(name);
        setLocating(false);
      },
      () => {
        setLocationHint("Couldn't detect location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  // Auto-detect on mount if location is empty
  React.useEffect(() => {
    if (!location) detectLiveLocation();
    // eslint-disable-next-line
  }, []);

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = ev => setPhotoURL(ev.target.result);
      reader.readAsDataURL(file);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit number');
      return;
    }
    if (!location.trim()) {
      setError('Location is required');
      return;
    }
    setLoading(true);
    try {
      let finalPhotoURL = photoURL;
      // Optionally, upload photoFile to server or cloud storage here
      // For now, just use base64 data URL for preview/demo
      let res;
      if (user.role === 'transporter') {
        res = await updateTransporterProfile(user._id, { ...user, name, phone, location, photoURL: finalPhotoURL });
      } else if (user.role === 'retailer') {
        res = await updateRetailerProfile(user._id, { ...user, name, phone, location, photoURL: finalPhotoURL });
      } else {
        res = await updateFarmerProfile(user._id, { ...user, name, phone, location, photoURL: finalPhotoURL });
      }
      if (onUpdateUser) onUpdateUser(res.user);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      {/* Back Arrow above title */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 shadow ring-1 ring-primary-100 hover:bg-primary-50 text-primary-600 transition-all duration-150"
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back</span>
        </button>
      </div>
      <h2 className="text-2xl font-bold mb-4 text-center">Profile</h2>
      <form onSubmit={handleSave} className="space-y-5">
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-24 h-24 mb-2">
            <img
              src={photoURL || '/default-avatar.png'}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border border-gray-200"
            />
            <button
              type="button"
              className="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full p-1 shadow"
              onClick={() => fileInputRef.current.click()}
              tabIndex={-1}
              aria-label="Change profile photo"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
              disabled={loading}
            />
          </div>
        </div>
        <div>
          <label className="block mb-1 font-medium">Name</label>
          <input
            className="input w-full"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            placeholder="Enter your name"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Phone Number</label>
          <input
            className="input w-full"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/[^\d]/g, ''))}
            maxLength={10}
            placeholder="Enter 10-digit phone"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Current Location</label>
          <div className="relative flex items-center">
            <input
              className="input w-full pr-10"
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              maxLength={100}
              placeholder="Enter your current location"
              disabled={loading}
            />
            <button
              type="button"
              onClick={detectLiveLocation}
              disabled={locating || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-gray-100 hover:bg-primary-100 text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-200"
              title="Detect location"
            >
              {locating ? (
                <MapPin className="w-5 h-5 animate-spin" />
              ) : (
                <MapPin className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-1">{locationHint || 'Live location will be used when available'}</p>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">Profile updated successfully!</div>}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}
