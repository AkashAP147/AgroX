import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFarmerCrops, updateFarmerProfile } from '../services/api';
import { getPendingCrops } from '../services/offlineDB';
import CropCard from '../components/CropCard';
import VoiceCropInput from '../components/VoiceCropInput';
import { Wheat, CheckCircle2, IndianRupee, Upload, MapPin, Plus, TrendingUp, TrendingDown, Minus, BarChart3, Sprout, Clock, ClipboardList } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const HEATMAP_DATA = [
  { crop: 'Rice', demand: 'High', level: 3 },
  { crop: 'Wheat', demand: 'Medium', level: 2 },
  { crop: 'Tomato', demand: 'Very High', level: 4 },
  { crop: 'Onion', demand: 'High', level: 3 },
  { crop: 'Potato', demand: 'Medium', level: 2 },
  { crop: 'Mango', demand: 'Low', level: 1 },
  { crop: 'Banana', demand: 'Medium', level: 2 },
  { crop: 'Sugarcane', demand: 'High', level: 3 }
];

const DEMAND_COLORS = {
  1: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  2: 'bg-amber-100 text-amber-700 ring-amber-200',
  3: 'bg-orange-100 text-orange-700 ring-orange-200',
  4: 'bg-red-100 text-red-700 ring-red-200'
};


import React from 'react';

export default function FarmerDashboard({ user, onUpdateUser }) {
  const { t } = useLanguage();
  const [crops, setCrops] = useState([]);
  const [pendingCrops, setPendingCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  // Only show phone modal if phone is missing and user hasn't dismissed for this account
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    // Use localStorage to persist modal dismissal per user
    if (!user.phone) {
      const dismissed = localStorage.getItem(`phoneModalDismissed_${user._id}`);
      setShowPhoneModal(!dismissed);
    } else {
      setShowPhoneModal(false);
    }
  }, [user.phone, user._id]);
  async function handleSavePhone(e) {
    e.preventDefault();
    setPhoneError('');
    if (!/^\d{10}$/.test(phoneInput)) {
      setPhoneError('Please enter a valid 10-digit number');
      return;
    }
    setPhoneLoading(true);
    try {
      const res = await updateFarmerProfile(user._id, { upiId: user.upiId, upiQr: user.upiQr, phone: phoneInput });
      if (onUpdateUser) onUpdateUser(res.user);
      setShowPhoneModal(false);
      localStorage.setItem(`phoneModalDismissed_${user._id}`, '1'); // Persist dismissal
    } catch (err) {
      setPhoneError(err.message);
    } finally {
      setPhoneLoading(false);
    }
  }

  useEffect(() => {
    loadCrops();
    loadPending();
  }, []);

  async function loadCrops() {
    try {
      const data = await getFarmerCrops(user._id);
      setCrops(data);
    } catch { /* offline */ }
    setLoading(false);
  }

  async function loadPending() {
    try {
      const data = await getPendingCrops();
      setPendingCrops(data);
    } catch { /* ignore */ }
  }

  // Function to update live location
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
        // Use a reverse geocoding API to get a human-readable address
        const { latitude, longitude } = position.coords;
        // Example using OpenStreetMap Nominatim
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        const address = data.display_name || `${latitude}, ${longitude}`;
        // Update backend profile
        const updated = await updateFarmerProfile(user._id, { ...user, location: address });
        if (onUpdateUser) onUpdateUser(updated.user);
      } catch (err) {
        setLocationError('Failed to update location');
      } finally {
        setLocationLoading(false);
      }
    }, (err) => {
      setLocationError('Unable to retrieve your location');
      setLocationLoading(false);
    });
  }

  return (
    <div className="page-container">
      {/* Phone Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-xs animate-fade-in">
            <h2 className="text-lg font-bold mb-2 text-center">Add your phone number</h2>
            <p className="text-gray-500 text-sm mb-4 text-center">For contact and notifications, please add your 10-digit phone number.</p>
            <form onSubmit={handleSavePhone}>
              <input
                className="input w-full mb-2"
                placeholder="Enter 10-digit phone"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value.replace(/[^\d]/g, ''))}
                maxLength={10}
                disabled={phoneLoading}
                autoFocus
              />
              {phoneError && <div className="text-red-600 text-xs mb-2">{phoneError}</div>}
              <button type="submit" className="btn btn-primary w-full" disabled={phoneLoading}>
                {phoneLoading ? 'Saving...' : 'Save'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Welcome header */}
      <div className="flex items-start sm:items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="page-title">{t('welcome')}, {user.name}!</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="page-subtitle flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400" />
              {user.location}
            </p>
            <button
              className="btn btn-xs btn-outline-primary flex items-center gap-1"
              onClick={handleUpdateLocation}
              disabled={locationLoading}
              title="Update live location"
            >
              {locationLoading ? (
                <span className="animate-spin"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg></span>
              ) : (
                <span className="flex items-center"><Upload className="w-4 h-4" /> <span className="hidden sm:inline">Update</span></span>
              )}
            </button>
          </div>
          {locationError && <div className="text-xs text-red-600 mt-1">{locationError}</div>}
        </div>
        <div className="flex items-center gap-2">
          <VoiceCropInput user={user} onCropAdded={loadCrops} buttonLabel="Voice Add" />
          <Link to="/farmer/add-crop" className="btn btn-primary text-base">
            <Plus className="w-5 h-5" /> {t('addCrop')}
          </Link>
          {/* Mobile only: See Orders button */}
          <Link
            to="/farmer/orders"
            className="btn btn-outline-primary text-base flex items-center gap-1 px-3 py-2 sm:hidden"
            style={{ minWidth: 0 }}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="hidden xs:inline">{t('seeOrders') || 'See Orders'}</span>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('totalCrops'), value: crops.length, Icon: Wheat, color: 'text-primary-600' },
          { label: t('available'), value: crops.filter(c => c.status === 'available').length, Icon: CheckCircle2, color: 'text-emerald-600' },
          { label: t('sold'), value: crops.filter(c => c.status === 'sold').length, Icon: IndianRupee, color: 'text-amber-600' },
          { label: t('pendingSync'), value: pendingCrops.length, Icon: Upload, color: 'text-blue-600' }
        ].map((stat, i) => (
          <div key={stat.label} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
            <stat.Icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Demand Heatmap */}
      <div className="card-static mb-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">
            <BarChart3 className="w-5 h-5 text-primary-600" /> {t('demandHeatmap')}
          </h2>
          <span className="badge badge-gray text-[10px]">{t('demoData')}</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {HEATMAP_DATA.map((item, i) => (
            <div key={item.crop}
              className={`rounded-xl p-3 text-center ring-1 transition-all duration-300 hover:scale-105 cursor-default
                ${DEMAND_COLORS[item.level]} animate-fade-in`}
              style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="font-bold text-sm">{item.crop}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{item.demand}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Price Predictions */}
      <div className="card-static mb-8 bg-gradient-to-br from-amber-50/50 to-white border-amber-100">
        <h2 className="section-title">
          <TrendingUp className="w-5 h-5 text-amber-600" /> {t('pricePredictions')}
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { name: 'Tomato', price: '₹25-30/kg', TrendIcon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
            { name: 'Onion', price: '₹18-22/kg', TrendIcon: TrendingDown, color: 'text-red-600 bg-red-50' },
            { name: 'Potato', price: '~₹15/kg', TrendIcon: Minus, color: 'text-amber-600 bg-amber-50' }
          ].map(p => (
            <div key={p.name} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Wheat className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm">{p.name}</div>
                <div className="text-xs text-gray-500">{t('nextWeek')} {p.price}</div>
              </div>
              <span className={`px-2 py-1 rounded-lg ${p.color}`}>
                <p.TrendIcon className="w-4 h-4" />
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 text-center">* {t('placeholderPredictions')}</p>
      </div>

      {/* Pending offline crops */}
      {pendingCrops.length > 0 && (
        <div className="mb-8">
          <h2 className="section-title text-amber-700">
            <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </span>
            {t('pendingSync')} ({pendingCrops.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {pendingCrops.map(crop => (
              <div key={crop.localId} className="card-static bg-amber-50/50 border-amber-200/60 animate-fade-in">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">{crop.cropName}</p>
                    <p className="text-sm text-gray-600">{crop.quantity} kg — ₹{crop.price}/kg</p>
                  </div>
                  <span className="badge badge-yellow text-[10px]">Offline</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Listed crops */}
      <div>
        <h2 className="section-title">
          <span className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
            <Sprout className="w-4 h-4 text-primary-600" />
          </span>
          {t('yourListedCrops')}
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card-static p-5">
                <div className="skeleton h-6 w-32 mb-3" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="skeleton h-10 rounded-lg" />
                  <div className="skeleton h-10 rounded-lg" />
                  <div className="skeleton h-10 rounded-lg" />
                  <div className="skeleton h-10 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : crops.length === 0 ? (
          <div className="card-static text-center py-12">
            <Sprout className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">{t('noCropsListed')}</p>
            <p className="text-gray-400 text-sm mt-1 mb-4">{t('startByAdding')}</p>
            <Link to="/farmer/add-crop" className="btn btn-primary">{t('addYourFirstCrop')}</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {crops.map(crop => <CropCard key={crop._id} crop={crop} />)}
          </div>
        )}
      </div>

    </div>
  );
}
