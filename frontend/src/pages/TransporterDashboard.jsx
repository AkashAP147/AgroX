import { useState, useEffect } from 'react';
import {
  getPendingDeliveries, getTransporterDeliveries,
  acceptDelivery, updateDeliveryStatus
} from '../services/api';
import { Truck, Package, MapPin, Clock, CheckCircle2, Navigation, Circle, ArrowDown, Map } from 'lucide-react';
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

  async function handleStatusUpdate(delivery, status) {
    try {
      await updateDeliveryStatus(delivery._id, status);
      loadAll();
    } catch (err) { alert(err.message); }
  }

  function togglePreviewMap(deliveryId) {
    setPreviewMaps(prev => ({ ...prev, [deliveryId]: !prev[deliveryId] }));
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
        pending.length === 0 ? (
          <div className="card-static text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">{t('noDeliveryRequests')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('checkBackLater')}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pending.map((d, i) => {
              const StatusIcon = STATUS_ICONS[d.deliveryStatus] || Clock;
              return (
                <div key={d._id} className="card hover:-translate-y-0.5 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{t('delivery')} #{d._id.slice(-6)}</h3>
                        {d.orderId && <p className="text-xs text-gray-400">{t('orderValue')} ₹{d.orderId.totalPrice?.toLocaleString('en-IN')}</p>}
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

                  {/* Live Map */}
                  <div className="mb-3">
                    <DeliveryMap
                      pickup={d.pickupCoordinates}
                      dropoff={d.dropCoordinates}
                      showLive={false}
                      height="180px"
                    />
                  </div>

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
              return (
                <div key={d._id} className="card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                        ${d.deliveryStatus === 'delivered' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                        <StatusIcon className={`w-5 h-5 ${d.deliveryStatus === 'delivered' ? 'text-emerald-600' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{t('delivery')} #{d._id.slice(-6)}</h3>
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

                  {/* Status actions */}
                  <div className="flex gap-2">
                    {d.deliveryStatus === 'accepted' && (
                      <button onClick={() => handleStatusUpdate(d, 'in-transit')}
                        className="btn btn-secondary flex-1">
                        <Navigation className="w-4 h-4" /> {t('startTransit')}
                      </button>
                    )}
                    {d.deliveryStatus === 'in-transit' && (
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
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
