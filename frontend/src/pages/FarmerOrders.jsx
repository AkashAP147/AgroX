import { useState, useEffect } from 'react';
import { getFarmerOrders, updateOrderStatus } from '../services/api';
import OrderCard from '../components/OrderCard';
import { ClipboardList } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function FarmerOrders({ user }) {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    try {
      const data = await getFarmerOrders(user._id);
      setOrders(data);
    } catch { /* offline */ }
    setLoading(false);
  }

  async function handleStatus(order, status) {
    try {
      await updateOrderStatus(order._id, status);
      loadOrders();
    } catch (err) {
      alert(err.message);
    }
  }

  function getActions(order) {
    if (order.status === 'pending') {
      return [
        { label: t('accept'), onClick: (o) => handleStatus(o, 'accepted'), className: 'btn-primary' },
        { label: t('reject'), onClick: (o) => handleStatus(o, 'rejected'), className: 'btn-danger' }
      ];
    }
    return null;
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const activeOrders = orders.filter(o => o.paymentStatus !== 'paid');
  const paymentHistory = orders.filter(o => o.paymentStatus === 'paid');
  const activeCount = activeOrders.filter(o => o.status === 'accepted').length;
  const displayOrders = activeTab === 'active' ? activeOrders : paymentHistory;
  const displayStats = activeTab === 'active'
    ? [
        { label: 'Active', value: activeCount, color: 'text-emerald-600' },
        { label: 'Pending', value: pendingCount, color: 'text-amber-600' }
      ]
    : [
        { label: 'Received', value: paymentHistory.length, color: 'text-blue-600' }
      ];

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="page-title">{t('yourOrders')}</h1>
        <p className="page-subtitle">{t('manageOrders')}</p>
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
          📦 Order List ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          💰 Transaction History ({paymentHistory.length})
        </button>
      </div>

      {/* Quick stats */}
      {!loading && displayOrders.length > 0 && (
        <div className="mb-6 flex gap-3">
          {displayStats.map((stat, i) => (
            <div key={stat.label} className="stat-card py-3 px-4 flex-1 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
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
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">{t('noOrdersYet')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('ordersWillAppear')}</p>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="card-static text-center py-12">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          {activeTab === 'active' ? (
            <>
              <p className="text-gray-500 font-medium">No active orders</p>
              <p className="text-gray-400 text-sm mt-1">New retailer orders will appear here</p>
            </>
          ) : (
            <>
              <p className="text-gray-500 font-medium">No transaction history yet</p>
              <p className="text-gray-400 text-sm mt-1">Paid retailer orders will appear here</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {displayOrders.map((order, i) => (
            <div key={order._id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <OrderCard order={order} actions={activeTab === 'active' ? getActions(order) : null} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
