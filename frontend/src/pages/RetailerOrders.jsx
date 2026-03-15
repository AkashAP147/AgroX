import { useState, useEffect } from 'react';
import { getRetailerOrders, getRetailerRatings, submitRating } from '../services/api';
import OrderCard from '../components/OrderCard';
import StarRating from '../components/StarRating';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, CreditCard, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function RetailerOrders({ user }) {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const navigate = useNavigate();

  // Rating state
  const [ratedOrders, setRatedOrders] = useState({}); // { orderId: { rating, comment } }
  const [ratingOpen, setRatingOpen] = useState(null); // orderId of currently open rating form
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => { loadOrders(); loadRatings(); }, []);

  async function loadOrders() {
    try {
      const data = await getRetailerOrders(user._id);
      setOrders(data);
    } catch { /* offline */ }
    setLoading(false);
  }

  async function loadRatings() {
    try {
      const ratings = await getRetailerRatings(user._id);
      const map = {};
      ratings.forEach(r => { map[r.orderId] = { rating: r.rating, comment: r.comment }; });
      setRatedOrders(map);
    } catch { /* ignore */ }
  }

  async function handleSubmitRating(order, { rating, comment }) {
    setRatingLoading(true);
    try {
      await submitRating({
        orderId: order._id,
        farmerId: order.farmerId,
        retailerId: user._id,
        rating,
        comment
      });
      setRatedOrders(prev => ({ ...prev, [order._id]: { rating, comment } }));
      setRatingOpen(null);
    } catch (err) {
      alert(err.message);
    }
    setRatingLoading(false);
  }

  function getActions(order) {
    if (order.status === 'accepted' && order.paymentStatus === 'unpaid') {
      return [{
        label: t('payNow'),
        onClick: (o) => navigate(`/payment/${o._id}`, { state: { total: o.totalPrice } }),
        className: 'btn-primary'
      }];
    }
    return null;
  }

  const unpaidCount = orders.filter(o => o.status === 'accepted' && o.paymentStatus === 'unpaid').length;
  const activeOrders = orders.filter(o => o.paymentStatus !== 'paid');
  const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
  
  const displayOrders = activeTab === 'active' ? activeOrders : paidOrders;
  const displayStats = activeTab === 'active' 
    ? [
        { label: 'Active', value: activeOrders.length, color: 'text-blue-600' },
        { label: 'Unpaid', value: unpaidCount, color: 'text-amber-600' }
      ]
    : [
        { label: 'Completed', value: paidOrders.length, color: 'text-emerald-600' }
      ];

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="page-title">{t('myOrders')}</h1>
        <p className="page-subtitle">{t('trackOrders')}</p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'active'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          💼 Active Orders ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 Payment History ({paidOrders.length})
        </button>
      </div>

      {/* Quick stats */}
      {!loading && displayOrders.length > 0 && (
        <div className="mb-6 flex gap-3">
          {displayStats.map((stat, i) => (
            <div key={stat.label} className={`stat-card py-3 px-4 flex-1 animate-fade-in`} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className={`stat-value text-lg ${stat.color}`}>{stat.value}</div>
              <div className="stat-label text-xs">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card-static p-5">
              <div className="flex justify-between mb-3">
                <div className="skeleton h-6 w-28" />
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="skeleton h-10 rounded-lg" />
                <div className="skeleton h-10 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card-static text-center py-12">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">{t('noOrdersYet')}</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">{t('browseMarketplace')}</p>
          <button onClick={() => navigate('/marketplace')} className="btn btn-primary">
            {t('marketplace')}
          </button>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="card-static text-center py-12">
          {activeTab === 'active' ? (
            <>
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No active orders</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">Start shopping to place orders</p>
              <button onClick={() => navigate('/marketplace')} className="btn btn-primary">
                {t('marketplace')}
              </button>
            </>
          ) : (
            <>
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No payment history yet</p>
              <p className="text-gray-400 text-sm mt-1">Complete an order to see payment history</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {displayOrders.map((order, i) => (
            <div key={order._id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <OrderCard order={order} actions={activeTab === 'active' ? getActions(order) : null} />

              {/* Rating section — only on paid orders (history tab) */}
              {activeTab === 'history' && order.paymentStatus === 'paid' && (
                <div className="mt-2">
                  {ratedOrders[order._id] ? (
                    /* Already rated — show read-only */
                    <div className="card-static p-3 bg-amber-50/60 border-amber-100">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-semibold text-gray-700">{t('yourRating')}</span>
                      </div>
                      <StarRating value={ratedOrders[order._id].rating} totalRatings={1} compact />
                      {ratedOrders[order._id].comment && (
                        <p className="text-xs text-gray-500 mt-1.5 italic">"{ratedOrders[order._id].comment}"</p>
                      )}
                    </div>
                  ) : ratingOpen === order._id ? (
                    /* Rating form open */
                    <div className="card-static p-4 border-2 border-amber-200 bg-amber-50/30">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-amber-500" /> {t('rateFarmer')}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setRatingOpen(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      <StarRating
                        editable
                        loading={ratingLoading}
                        onSubmit={(data) => handleSubmitRating(order, data)}
                      />
                    </div>
                  ) : (
                    /* Rate button */
                    <button
                      type="button"
                      onClick={() => setRatingOpen(order._id)}
                      className="btn btn-outline w-full text-sm py-2.5 flex items-center justify-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <Star className="w-4 h-4" /> {t('rateFarmer')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
