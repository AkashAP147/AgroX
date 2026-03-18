import { useState, useEffect, useMemo } from 'react';
import { getMarketplaceCrops, updateRetailerProfile, getRetailerOrders } from '../services/api';
import CropCard from '../components/CropCard';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Wheat, LocateFixed, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

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

export default function Marketplace({ user, onUpdateUser }) {
  const { t } = useLanguage();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [userCoords, setUserCoords] = useState(null);
  const [filters, setFilters] = useState({ cropName: '' });
  const [activeTab, setActiveTab] = useState('recommended'); // 'recommended' or 'all'
  const [preferredCrops, setPreferredCrops] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    loadCrops();
    detectMyLocation();
    // Fetch order history for personalized recommendations
    if (user && user.role === 'retailer' && user._id) {
      getRetailerOrders(user._id)
        .then(orders => {
          const cropNames = new Set(orders.map(o => o.cropName?.toLowerCase()).filter(Boolean));
          setPreferredCrops(cropNames);
        })
        .catch(() => {});
    }
  }, []);

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

  function detectMyLocation() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not available on this device');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        // Also save location to retailer profile in DB (like FarmerDashboard)
        if (user && user.role === 'retailer' && user._id) {
          try {
            const address = await reverseGeocode(latitude, longitude);
            const res = await updateRetailerProfile(user._id, { location: address });
            if (onUpdateUser) onUpdateUser(res.user);
          } catch { /* ignore save error */ }
        }
        setGeoLoading(false);
      },
      () => {
        setGeoError('Location permission denied. Enable GPS to get nearby recommendations.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  // Multi-factor weighted recommendation algorithm
  // Score = (0.4 × distance) + (0.3 × rating) + (0.2 × freshness) + (0.1 × price) + order history bonus
  const recommendedFarmers = useMemo(() => {
    if (!userCoords) return [];
    const now = new Date();

    // Find max price across all crops for normalization
    const maxPrice = Math.max(...crops.map(c => c.price || 0), 1);

    // Map: farmerId -> { ...farmer, crops: Map<cropName, crop> }
    const farmerMap = new Map();
    crops.forEach((crop) => {
      if (!crop.coordinates || typeof crop.coordinates.lat !== 'number' || typeof crop.coordinates.lng !== 'number') return;
      if (crop.quantity <= 0) return;
      // Skip crops with default India-center coords (GPS wasn't captured)
      if (Math.abs(crop.coordinates.lat - 20.5937) < 0.001 && Math.abs(crop.coordinates.lng - 78.9629) < 0.001) return;
      const distanceKm = haversineDistanceKm(userCoords, crop.coordinates);
      if (distanceKm > 100) return;
      const farmerKey = crop.farmerId || crop.farmerName || crop._id;
      if (!farmerMap.has(farmerKey)) {
        farmerMap.set(farmerKey, {
          farmerId: crop.farmerId,
          farmerName: crop.farmerName || 'Farmer',
          location: crop.location,
          distanceKm,
          crops: new Map(),
          farmerRating: crop.farmerRating || 0,
          farmerTotalRatings: crop.farmerTotalRatings || 0,
        });
      }
      const cropMap = farmerMap.get(farmerKey).crops;
      const existing = cropMap.get(crop.cropName);
      const cropDate = crop.createdAt ? new Date(crop.createdAt) : now;
      if (!existing || (existing.createdAt && cropDate > new Date(existing.createdAt))) {
        cropMap.set(crop.cropName, crop);
      }
    });

    // Score each farmer using weighted multi-factor approach
    return Array.from(farmerMap.values())
      .map(farmer => {
        const cropsArr = Array.from(farmer.crops.values());

        // 1. Distance score (tiered: 0-30km=1.0, 30-60km=0.6, 60-100km=0.3)
        const distScore = farmer.distanceKm <= 30 ? 1.0
          : farmer.distanceKm <= 60 ? 0.6 : 0.3;

        // 2. Rating score (0-1, normalized from 0-5 stars)
        const ratingScore = (farmer.farmerRating || 0) / 5;

        // 3. Freshness score (average across crops, decays over 30 days)
        const avgFreshness = cropsArr.reduce((sum, c) => {
          const days = (now - new Date(c.createdAt || now)) / (1000 * 60 * 60 * 24);
          return sum + Math.max(0, 1 - days / 30);
        }, 0) / (cropsArr.length || 1);

        // 4. Price score (cheaper is better, averaged across crops)
        const avgPriceScore = cropsArr.reduce((sum, c) => {
          return sum + (1 - (c.price || 0) / maxPrice);
        }, 0) / (cropsArr.length || 1);

        // 5. Order history bonus: +0.2 if farmer has crops the retailer has ordered before
        const hasPreferred = cropsArr.some(c => preferredCrops.has(c.cropName?.toLowerCase()));
        const historyBonus = hasPreferred ? 0.2 : 0;

        // Weighted score
        const score = (0.4 * distScore) + (0.3 * ratingScore) + (0.2 * avgFreshness) + (0.1 * avgPriceScore) + historyBonus;

        // Determine primary recommendation reason
        const factors = [
          { key: 'distance', val: distScore * 0.4, label: 'Nearest to you' },
          { key: 'rating', val: ratingScore * 0.3, label: 'Highly rated farmer' },
          { key: 'freshness', val: avgFreshness * 0.2, label: 'Freshly listed crops' },
          { key: 'price', val: avgPriceScore * 0.1, label: 'Great prices' },
        ];
        if (hasPreferred) factors.push({ key: 'history', val: historyBonus, label: 'Matches your past orders' });
        factors.sort((a, b) => b.val - a.val);
        const recommendReason = factors[0]?.label || 'Recommended for you';

        return {
          ...farmer,
          crops: cropsArr.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : now;
            const dateB = b.createdAt ? new Date(b.createdAt) : now;
            return dateB - dateA;
          }),
          score,
          recommendReason,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [crops, userCoords, preferredCrops]);

  async function loadCrops() {
    setLoading(true);
    try {
      const params = {};
      if (filters.cropName) params.cropName = filters.cropName;
      // Send retailer coordinates if available
      if (userCoords) {
        params.retailerLat = userCoords.lat;
        params.retailerLng = userCoords.lng;
      }
      const data = await getMarketplaceCrops(params);
      setCrops(data);
    } catch { /* offline */ }
    setLoading(false);
  }

  function handleFilter(e) {
    e.preventDefault();
    loadCrops();
  }

  function handleOrder(crop) {
    navigate('/order/' + crop._id, { state: { crop } });
  }

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="page-title flex items-center gap-2">
          <ShoppingCart className="w-8 h-8 text-primary-600" /> {t('cropMarketplace')}
        </h1>
        <p className="page-subtitle">{t('browseAndOrder')}</p>
        <div className="flex items-center gap-2 mt-3">
          <button
            className="page-subtitle flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-1 py-0.5"
            onClick={detectMyLocation}
            disabled={geoLoading}
            title="Click to update location"
            style={{ background: 'none', border: 'none' }}
          >
            {geoLoading ? (
              <span className="animate-spin"><svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg></span>
            ) : (
              <MapPin className="w-4 h-4 text-blue-600" />
            )}
            <span className="ml-1">{user?.location || (userCoords ? 'Location set' : 'Set your location')}</span>
          </button>
        </div>
      </div>

      {/* Search Bar (Flipkart style) */}
      <form onSubmit={handleFilter} className="flex items-center gap-2 mb-8">
        <input
          className="input text-base flex-1 shadow-sm border border-gray-300 rounded-lg px-4 py-2"
          placeholder={t('Search for crops, e.g. Wheat, Rice...')}
          value={filters.cropName}
          onChange={e => setFilters({ cropName: e.target.value })}
        />
        <button type="submit" className="btn btn-primary px-5 py-2 text-base flex items-center gap-2">
          <Search className="w-5 h-5" />
          {t('searchCrops')}
        </button>
      </form>


      {/* Toggle Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-full max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('recommended')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200
            ${activeTab === 'recommended'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}>
          <MapPin className="inline w-4 h-4 mr-1" /> Recommended for You
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200
            ${activeTab === 'all'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}>
          <ShoppingCart className="inline w-4 h-4 mr-1" /> All Crops
        </button>
      </div>



      {/* Section Toggle Logic */}
      {activeTab === 'recommended' && (
        <section className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="section-title mb-0">
              <MapPin className="w-5 h-5 text-primary-600" /> Recommended for You
            </h2>
          </div>
          {!loading && (
            <>
              {!userCoords && !geoLoading && (
                <p className="text-sm text-gray-500">Enable location to get personalized recommendations.</p>
              )}
              {geoError && (
                <p className="text-sm text-red-600">{geoError}</p>
              )}
              {userCoords && recommendedFarmers.length === 0 && (
                <p className="text-sm text-gray-500">No recommended farmers found within 30-60km.</p>
              )}
              {recommendedFarmers.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recommendedFarmers.map((f) => (
                    <div key={`${f.farmerId || f.farmerName}-${f.location}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900 truncate">{f.farmerName}</span>
                        {f.farmerRating > 0 && (
                          <span className="ml-2 text-xs text-amber-600 font-semibold">★ {f.farmerRating.toFixed(1)} ({f.farmerTotalRatings})</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{f.location}</p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-primary-700 font-semibold">{f.distanceKm.toFixed(1)} km away</span>
                        <span className="text-gray-500">{f.crops.length} crop(s)</span>
                      </div>
                      <p className="text-xs text-green-700 mt-1 truncate font-medium">✦ {f.recommendReason}</p>
                      {/* List crops for this farmer */}
                      <div className="mt-2 grid gap-2">
                        {f.crops.map((crop, i) => (
                          <CropCard key={crop._id} crop={crop} isFarmer={false} actionLabel={user ? t('orderNow') : null} onAction={handleOrder} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {activeTab === 'all' && (
        <section>
          <h2 className="section-title mb-3">
            <ShoppingCart className="w-5 h-5 text-primary-600" /> All Crops
          </h2>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="card-static p-5">
                  <div className="flex justify-between mb-3">
                    <div className="skeleton h-6 w-24" />
                    <div className="skeleton h-6 w-16 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="skeleton h-10 rounded-lg" />
                    <div className="skeleton h-10 rounded-lg" />
                    <div className="skeleton h-10 rounded-lg" />
                    <div className="skeleton h-10 rounded-lg" />
                  </div>
                  <div className="skeleton h-10 rounded-xl" />
                </div>
              ))}
            </div>
          ) : crops.length === 0 ? (
            <div className="card-static text-center py-16">
              <Wheat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">{t('noCropsFound')}</p>
              <p className="text-gray-400 text-sm mt-1">{t('tryAdjusting')}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {crops.map((crop, i) => (
                <div key={crop._id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <CropCard crop={crop}
                    actionLabel={user ? t('orderNow') : null}
                    onAction={handleOrder}
                    isFarmer={false}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Results section removed for 'All Crops' to prevent duplicate display. */}
    </div>
  );
}
