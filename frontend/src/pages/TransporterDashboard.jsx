// Haversine formula to compute distance between two lat/lng points in km
function getDistanceKm(lat1, lon1, lat2, lon2) {
  function toRad(x) { return x * Math.PI / 180; }
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Try to extract [lat, lng] from user.location string ("lat, lng")
function parseLatLng(str) {
  if (!str) return null;
  const match = str.match(/(-?\d+\.?\d*)[, ]+(-?\d+\.?\d*)/);
  if (!match) return null;
  return [parseFloat(match[1]), parseFloat(match[2])];
}
import { useState, useEffect } from 'react';
import {
  getPendingDeliveries, getTransporterDeliveries,
  acceptDelivery, updateDeliveryStatus, verifyDeliveryOtp
} from '../services/api';
import { Truck, Package, MapPin, Clock, CheckCircle2, Navigation, Circle, ArrowDown, Map } from 'lucide-react';

// Format date/time utility
function formatDateTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
import { useLanguage } from '../context/LanguageContext';
import DeliveryMap from '../components/DeliveryMap';

const STATUS_STYLES = {
  pending: 'badge-yellow',
  accepted: 'badge-blue',
  'in-transit': 'badge-blue',
  delivered: 'badge-green'
};

const STATUS_ICONS = {
  pending: Clock,
  accepted: CheckCircle2,
  'in-transit': Truck,
  delivered: Package
};

export default function TransporterDashboard({ user }) {
  const { t } = useLanguage();
  const [pending, setPending] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [tab, setTab] = useState('available');
  const [loading, setLoading] = useState(true);
  const [previewMaps, setPreviewMaps] = useState({});
  const [expandedJob, setExpandedJob] = useState(null); // job _id for which map is shown
  const [otpModal, setOtpModal] = useState({ open: false, delivery: null, otp: '', error: '', loading: false, type: null });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([
        getPendingDeliveries(),
        getTransporterDeliveries(user._id)
      ]);
      setPending(p);
      setMyJobs(m);
    } catch { /* offline */ }
    setLoading(false);
  }

  async function handleAccept(delivery) {
    try {
      await acceptDelivery(delivery._id, { transporterId: user._id, transporterName: user.name });
      loadAll();
    } catch (err) { alert(err.message); }
  }


  // New: handle pickup OTP for starting transit
  async function handleStatusUpdate(delivery, status) {
    if (status === 'delivered') {
      setOtpModal({ open: true, delivery, otp: '', error: '', loading: false, type: 'delivery' });
      return;
    }
    if (status === 'in-transit') {
      setOtpModal({ open: true, delivery, otp: '', error: '', loading: false, type: 'pickup' });
      return;
    }
    try {
      await updateDeliveryStatus(delivery._id, { status });
      loadAll();
    } catch (err) { alert(err.message); }
  }

  async function handleOtpSubmit() {
    setOtpModal(m => ({ ...m, loading: true, error: '' }));
    try {
      if (otpModal.type === 'pickup') {
        // Start transit: send pickupOtp
        await updateDeliveryStatus(otpModal.delivery._id, { status: 'in-transit', pickupOtp: otpModal.otp });
        setOtpModal({ open: false, delivery: null, otp: '', error: '', loading: false });
        loadAll();
        return;
      }
      // Delivery OTP (existing logic)
      const orderId = otpModal.delivery.orderId?._id || otpModal.delivery.orderId;
      await verifyDeliveryOtp(orderId, otpModal.otp);
      setOtpModal({ open: false, delivery: null, otp: '', error: '', loading: false });
      loadAll();
    } catch (err) {
      setOtpModal(m => ({ ...m, error: err.message, loading: false }));
    }
  }

  function togglePreviewMap(deliveryId) {
    setPreviewMaps(prev => ({ ...prev, [deliveryId]: !prev[deliveryId] }));
  }

  // Sort pending jobs by distance to transporter (nearest first)
  let sortedPending = pending;
  const userCoords = parseLatLng(user.location);
  // Compute distances and recommendation for each job
  let jobDistances = {};
  if (userCoords && pending.length > 0) {
    sortedPending = [...pending].sort((a, b) => {
      const aCoords = a.pickupCoordinates || parseLatLng(a.pickupLocation);
      const bCoords = b.pickupCoordinates || parseLatLng(b.pickupLocation);
      let distA = 99999, distB = 99999;
      if (aCoords) distA = getDistanceKm(userCoords[0], userCoords[1], aCoords[0], aCoords[1]);
      if (bCoords) distB = getDistanceKm(userCoords[0], userCoords[1], bCoords[0], bCoords[1]);
      jobDistances[a._id] = distA;
      jobDistances[b._id] = distB;
      return distA - distB;
    });
    // Also fill in for jobs not compared
    for (const job of pending) {
      if (!(job._id in jobDistances)) {
        const coords = job.pickupCoordinates || parseLatLng(job.pickupLocation);
        if (coords) jobDistances[job._id] = getDistanceKm(userCoords[0], userCoords[1], coords[0], coords[1]);
      }
    }
  }
  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title flex items-center gap-2">
          <Truck className="w-8 h-8 text-primary-600" /> {t('transporterDashboard')}
        </h1>
        <p className="page-subtitle flex items-center gap-1.5 mt-1">
          {t('welcome')}, {user.name}
          <span className="text-gray-300">•</span>
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {user.location}</span>
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="stat-card py-4 animate-fade-in">
          <div className="stat-value text-xl">{pending.length}</div>
          <div className="stat-label text-xs">{t('available')}</div>
        </div>
        <div className="stat-card py-4 animate-fade-in-d1">
          <div className="stat-value text-xl text-blue-600">
            {myJobs.filter(j => j.deliveryStatus !== 'delivered').length}
          </div>
          <div className="stat-label text-xs">{t('active')}</div>
        </div>
        <div className="stat-card py-4 animate-fade-in-d2">
          <div className="stat-value text-xl text-emerald-600">
            {myJobs.filter(j => j.deliveryStatus === 'delivered').length}
          </div>
          <div className="stat-label text-xs">{t('completed')}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setTab('available')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200
            ${tab === 'available'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}>
          Available ({pending.length})
        </button>
        <button onClick={() => setTab('my')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200
            ${tab === 'my'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }`}>
          {t('myJobs')} ({myJobs.length})
        </button>
      </div>

      {/* Inline OTP Modal (for pickup and delivery) inside the relevant order card */}


      {/* Content */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-static p-5">
              <div className="flex justify-between mb-3">
                <div className="skeleton h-6 w-36" />
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="skeleton h-5 w-48" />
                <div className="skeleton h-5 w-44" />
              </div>
              <div className="skeleton h-10 w-full rounded-xl mt-4" />
            </div>
          ))}
        </div>
      ) : tab === 'available' ? (
        sortedPending.length === 0 ? (
          <div className="card-static text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">{t('noDeliveryRequests')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('checkBackLater')}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedPending.map((d, i) => {
              const StatusIcon = STATUS_ICONS[d.deliveryStatus] || Clock;
              const dist = jobDistances[d._id];
              const recommended = typeof dist === 'number' && dist < 20;
              const isExpanded = expandedJob === d._id;
              return (
                <div key={d._id} className="card hover:-translate-y-0.5 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  {/* Recommendation badge and order time */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${recommended ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' : 'bg-gray-100 text-gray-400 ring-1 ring-gray-200'}`}
                        style={{ minWidth: 90 }}>
                        {recommended ? 'Recommended' : 'Not Recommended'}
                        {typeof dist === 'number' ? ` (${Math.round(dist)} km)` : ''}
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{t('delivery')} #{d._id.slice(-6)}</h3>
                        <p className="text-xs text-gray-400">Ordered: {formatDateTime(d.createdAt)}</p>
                        {d.orderId && <p className="text-xs text-gray-400">{t('orderValue')} ₹{d.orderId.totalPrice?.toLocaleString('en-IN')}</p>}
                      </div>
                    </div>
                    <span className={`badge ${STATUS_STYLES[d.deliveryStatus]}`}>
                      <StatusIcon className="w-3 h-3 inline -mt-0.5 mr-0.5" /> {d.deliveryStatus}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-3 cursor-pointer" onClick={() => setExpandedJob(isExpanded ? null : d._id)}>
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 mt-0.5">
                        <Circle className="w-3 h-3 text-primary-500 fill-primary-500" />
                        <div className="w-0.5 h-8 bg-gray-300" />
                        <Circle className="w-3 h-3 text-red-500 fill-red-500" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{t('pickup')}</p>
                          <p className="text-sm font-medium text-gray-900">{d.pickupLocation}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{t('dropOff')}</p>
                          <p className="text-sm font-medium text-gray-900">{d.dropLocation}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-blue-500 mt-2 text-right select-none">{isExpanded ? 'Hide Map' : 'Show Map'}</div>
                  </div>

                  {/* Show map only if expanded */}
                  {isExpanded && (
                    <div className="mb-3">
                      <DeliveryMap
                        pickup={d.pickupCoordinates}
                        dropoff={d.dropCoordinates}
                        showLive={false}
                        height="180px"
                      />
                    </div>
                  )}

                  <button onClick={() => handleAccept(d)} className="btn btn-primary w-full">
                    <CheckCircle2 className="w-4 h-4" /> {t('acceptJob')}
                  </button>
                </div>
              );
            })}
          </div>
        )
      ) : (
        myJobs.length === 0 ? (
          <div className="card-static text-center py-12">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">{t('noActiveJobs')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('acceptAvailableJobs')}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {myJobs.map((d, i) => {
              const StatusIcon = STATUS_ICONS[d.deliveryStatus] || Clock;
              const isDelivered = d.deliveryStatus === 'delivered';
              const showMap = !isDelivered || previewMaps[d._id];
              const showOtpInline = otpModal.open && otpModal.delivery && otpModal.delivery._id === d._id;
              return (
                <div key={d._id} className="card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  {/* Header with order time */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                        ${d.deliveryStatus === 'delivered' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                        <StatusIcon className={`w-5 h-5 ${d.deliveryStatus === 'delivered' ? 'text-emerald-600' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{t('delivery')} #{d._id.slice(-6)}</h3>
                        <p className="text-xs text-gray-400">Ordered: {formatDateTime(d.createdAt)}</p>
                        <p className="text-xs text-gray-400">{d.deliveryStatus === 'delivered' ? t('completed') : t('inProgress')}</p>
                      </div>
                    </div>
                    <span className={`badge ${STATUS_STYLES[d.deliveryStatus]}`}>
                      <StatusIcon className="w-3 h-3 inline -mt-0.5 mr-0.5" /> {d.deliveryStatus}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 mt-0.5">
                        <Circle className="w-3 h-3 text-primary-500 fill-primary-500" />
                        <div className="w-0.5 h-8 bg-gray-300" />
                        <Circle className="w-3 h-3 text-red-500 fill-red-500" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{t('pickup')}</p>
                          <p className="text-sm font-medium text-gray-900">{d.pickupLocation}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{t('dropOff')}</p>
                          <p className="text-sm font-medium text-gray-900">{d.dropLocation}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Navigation Map */}
                  {showMap && (
                    <div className="mb-3">
                      <DeliveryMap
                        pickup={d.pickupCoordinates}
                        dropoff={d.dropCoordinates}
                        showLive={d.deliveryStatus === 'accepted' || d.deliveryStatus === 'in-transit'}
                        height="220px"
                      />
                      {(d.deliveryStatus === 'accepted' || d.deliveryStatus === 'in-transit') && (
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-blue-600 font-medium">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          Live tracking active
                        </div>
                      )}
                    </div>
                  )}

                  {isDelivered && (
                    <div className="mb-3">
                      <button
                        onClick={() => togglePreviewMap(d._id)}
                        className="btn btn-secondary w-full"
                      >
                        <Map className="w-4 h-4" /> {previewMaps[d._id] ? 'Hide Navigation Preview' : 'Navigation Preview'}
                      </button>
                    </div>
                  )}

                  {/* Status actions and inline OTP input */}
                  <div className="flex flex-col gap-2">
                    {showOtpInline && (
                      <div className="mb-2 rounded-xl border border-primary-200 bg-primary-50/80 p-4">
                        <h2 className="text-lg font-bold mb-2 text-center">
                          {otpModal.type === 'pickup' ? 'Enter Pickup OTP' : 'Enter Delivery OTP'}
                        </h2>
                        <p className="text-gray-500 text-sm mb-4 text-center">
                          {otpModal.type === 'pickup'
                            ? 'Ask the farmer for the 6-digit OTP to start transit.'
                            : 'Ask the retailer for the 6-digit OTP to complete delivery.'}
                        </p>
                        <input
                          className="input w-full mb-2 text-center tracking-widest text-lg"
                          placeholder="Enter OTP"
                          value={otpModal.otp}
                          onChange={e => setOtpModal(m => ({ ...m, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                          maxLength={6}
                          disabled={otpModal.loading}
                          autoFocus
                        />
                        {otpModal.error && <div className="text-red-600 text-xs mb-2 text-center">{otpModal.error}</div>}
                        <div className="flex gap-2 mt-2">
                          <button className="btn btn-secondary flex-1" onClick={() => setOtpModal({ open: false, delivery: null, otp: '', error: '', loading: false, type: null })} disabled={otpModal.loading}>Cancel</button>
                          <button className="btn btn-primary flex-1" onClick={handleOtpSubmit} disabled={otpModal.loading || otpModal.otp.length !== 6}>
                            {otpModal.loading ? (otpModal.type === 'pickup' ? 'Verifying...' : 'Verifying...') : (otpModal.type === 'pickup' ? 'Start Transit' : 'Confirm Delivery')}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {d.deliveryStatus === 'accepted' && !showOtpInline && (
                        <button onClick={() => handleStatusUpdate(d, 'in-transit')}
                          className="btn btn-secondary flex-1">
                          <Navigation className="w-4 h-4" /> {t('startTransit')}
                        </button>
                      )}
                      {d.deliveryStatus === 'in-transit' && !showOtpInline && (
                        <button onClick={() => handleStatusUpdate(d, 'delivered')}
                          className="btn btn-primary flex-1">
                          <CheckCircle2 className="w-4 h-4" /> {t('markDelivered')}
                        </button>
                      )}
                      {d.deliveryStatus === 'delivered' && (
                        <div className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm">
                          <CheckCircle2 className="w-4 h-4" /> {t('deliveryCompleted')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
