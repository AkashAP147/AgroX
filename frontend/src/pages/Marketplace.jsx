import { useState, useEffect, useMemo } from 'react';
import { getMarketplaceCrops } from '../services/api';
import CropCard from '../components/CropCard';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Wheat, LocateFixed, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Marketplace({ user }) {
  const { t } = useLanguage();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [userCoords, setUserCoords] = useState(null);
  const [filters, setFilters] = useState({ cropName: '', minPrice: '', maxPrice: '', location: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadCrops();
    detectMyLocation();
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
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError('Location permission denied. Enable GPS to get nearby recommendations.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  const nearbyFarmers = useMemo(() => {
    if (!userCoords) return [];

    const farmerMap = new Map();

    crops.forEach((crop) => {
      if (!crop.coordinates || typeof crop.coordinates.lat !== 'number' || typeof crop.coordinates.lng !== 'number') return;
      const distanceKm = haversineDistanceKm(userCoords, crop.coordinates);
      const key = crop.farmerId || crop.farmerName || crop._id;
      const prev = farmerMap.get(key);

      if (!prev || distanceKm < prev.distanceKm) {
        farmerMap.set(key, {
          farmerId: crop.farmerId,
          farmerName: crop.farmerName || 'Farmer',
          location: crop.location,
          distanceKm,
          sampleCrop: crop.cropName,
          cropCount: prev ? prev.cropCount + 1 : 1,
        });
      } else {
        prev.cropCount += 1;
      }
    });

    return Array.from(farmerMap.values())
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);
  }, [crops, userCoords]);

  async function loadCrops() {
    setLoading(true);
    try {
      const params = {};
      if (filters.cropName) params.cropName = filters.cropName;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.location) params.location = filters.location;
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
      </div>

      {/* Filters */}
      <form onSubmit={handleFilter} className="card-static mb-8 p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input className="input text-sm" placeholder={t('cropNameFilter')}
            value={filters.cropName} onChange={e => setFilters(f => ({ ...f, cropName: e.target.value }))} />
          <input className="input text-sm" placeholder={t('locationFilter')}
            value={filters.location} onChange={e => setFilters(f => ({ ...f, location: e.target.value }))} />
          <input type="number" className="input text-sm" placeholder={t('minPrice')}
            value={filters.minPrice} onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))} />
          <input type="number" className="input text-sm" placeholder={t('maxPrice')}
            value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))} />
        </div>
        <button type="submit" className="btn btn-primary mt-3 text-sm py-2.5">
          <Search className="w-4 h-4" /> {t('searchCrops')}
        </button>
      </form>

      {/* Results count */}
      {!loading && crops.length > 0 && (
        <p className="text-sm text-gray-400 mb-4 font-medium">
          {crops.length} {t('cropsAvailable')}
        </p>
      )}

      {/* Nearby farmer recommendations */}
      {!loading && (
        <div className="card-static mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="section-title mb-0">
              <MapPin className="w-5 h-5 text-primary-600" /> Nearby Farmers Recommended for You
            </h2>
            <button
              type="button"
              onClick={detectMyLocation}
              className="btn btn-outline text-xs py-2 px-3"
              disabled={geoLoading}
            >
              <LocateFixed className={`w-4 h-4 ${geoLoading ? 'animate-spin' : ''}`} />
              {geoLoading ? 'Detecting...' : 'Use my location'}
            </button>
          </div>

          {!userCoords && !geoLoading && (
            <p className="text-sm text-gray-500">Enable location to get nearby farmer recommendations.</p>
          )}

          {geoError && (
            <p className="text-sm text-red-600">{geoError}</p>
          )}

          {userCoords && nearbyFarmers.length === 0 && (
            <p className="text-sm text-gray-500">No nearby farmers found yet.</p>
          )}

          {nearbyFarmers.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {nearbyFarmers.map((f) => (
                <div key={`${f.farmerId || f.farmerName}-${f.location}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm font-bold text-gray-900 truncate">{f.farmerName}</p>
                  <p className="text-xs text-gray-500 truncate">{f.location}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-primary-700 font-semibold">{f.distanceKm.toFixed(1)} km away</span>
                    <span className="text-gray-500">{f.cropCount} crop(s)</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">Top crop: {f.sampleCrop}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results */}
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
                onAction={handleOrder} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
