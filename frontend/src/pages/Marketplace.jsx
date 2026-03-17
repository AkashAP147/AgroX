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
  const [filters, setFilters] = useState({ cropName: '' });
  const [activeTab, setActiveTab] = useState('recommended'); // 'recommended' or 'all'
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

  // Recommend farmers within 30-60km, sorted by rating, with their crops and reason
  const recommendedFarmers = useMemo(() => {
    if (!userCoords) return [];
    const farmerMap = new Map();
    crops.forEach((crop) => {
      if (!crop.coordinates || typeof crop.coordinates.lat !== 'number' || typeof crop.coordinates.lng !== 'number') return;
      const distanceKm = haversineDistanceKm(userCoords, crop.coordinates);
      if (distanceKm < 30 || distanceKm > 60) return; // Only 30-60km
      const key = crop.farmerId || crop.farmerName || crop._id;
      if (!farmerMap.has(key)) {
        farmerMap.set(key, {
          farmerId: crop.farmerId,
          farmerName: crop.farmerName || 'Farmer',
          location: crop.location,
          distanceKm,
          crops: [],
          farmerRating: crop.farmerRating || 0,
          farmerTotalRatings: crop.farmerTotalRatings || 0,
        });
      }
      farmerMap.get(key).crops.push(crop);
    });
    // Sort by rating desc, then by distance asc
    return Array.from(farmerMap.values())
      .sort((a, b) => {
        if (b.farmerRating !== a.farmerRating) return b.farmerRating - a.farmerRating;
        return a.distanceKm - b.distanceKm;
      });
  }, [crops, userCoords]);

  async function loadCrops() {
    setLoading(true);
    try {
      const params = {};
      if (filters.cropName) params.cropName = filters.cropName;
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
                      <p className="text-xs text-green-700 mt-1 truncate font-medium">Recommended: High rated farmer near you</p>
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
