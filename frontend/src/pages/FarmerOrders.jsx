import { useState, useEffect } from 'react';
import { getFarmerOrders, updateOrderStatus, getOrderDetails } from '../services/api';
import OrderCard from '../components/OrderCard';
import Modal from '../components/Modal';
import OrderStatusTracker from '../components/OrderStatusTracker';
import { ClipboardList, Download, Package, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import * as XLSX from 'xlsx';

export default function FarmerOrders({ user }) {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();


  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    try {
      const data = await getFarmerOrders(user._id);
      // For each order, fetch delivery info to get pickupOtp
      const ordersWithDelivery = await Promise.all(
        data.map(async (order) => {
          try {
            const details = await getOrderDetails(order._id);
            return { ...order, pickupOtp: details.delivery?.pickupOtp };
          } catch {
            return order;
          }
        })
      );
      setOrders(ordersWithDelivery);
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
    // Accept/reject actions removed: orders are auto-accepted
    return null;
  }

  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: All Orders
    const orderRows = orders.map(o => ({
      'Crop Name': o.cropName || 'N/A',
      'Retailer Name': o.retailerName || 'N/A',
      'Quantity (kg)': o.quantity,
      'Total Price (₹)': o.totalPrice,
      'Farmer Payout (₹)': o.farmerPayout || 0,
      'Status': o.status,
      'Payment Status': o.paymentStatus,
      'Transaction ID': o.transactionId || 'N/A',
      'Date': new Date(o.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    }));
    const ws1 = XLSX.utils.json_to_sheet(orderRows);
    ws1['!cols'] = [
      { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 16 },
      { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'All Orders');

    // Sheet 2: Retailer Summary (earnings per retailer)
    const retailerMap = {};
    orders.forEach(o => {
      const name = o.retailerName || 'Unknown';
      if (!retailerMap[name]) {
        retailerMap[name] = { orderCount: 0, totalQty: 0, totalEarned: 0 };
      }
      retailerMap[name].orderCount += 1;
      retailerMap[name].totalQty += o.quantity;
      retailerMap[name].totalEarned += (o.farmerPayout || o.totalPrice || 0);
    });
    const summaryRows = Object.entries(retailerMap).map(([name, data]) => ({
      'Retailer Name': name,
      'Order Count': data.orderCount,
      'Total Quantity (kg)': data.totalQty,
      'Total Earned (₹)': data.totalEarned,
      'Avg Order Value (₹)': Math.round(data.totalEarned / data.orderCount)
    }));
    const ws2 = XLSX.utils.json_to_sheet(summaryRows);
    ws2['!cols'] = [
      { wch: 22 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Retailer Summary');

    XLSX.writeFile(wb, 'farmer_orders_report.xlsx');
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const allOrders = orders;
  const paymentHistory = orders.filter(o => o.paymentStatus === 'paid');
  const activeCount = allOrders.filter(o => o.status === 'accepted').length;
  const displayOrders = activeTab === 'active' ? allOrders : paymentHistory;
  const displayStats = activeTab === 'active'
    ? [
        { label: 'Total', value: allOrders.length, color: 'text-emerald-600' },
        { label: 'Pending', value: pendingCount, color: 'text-amber-600' },
        { label: 'Accepted', value: activeCount, color: 'text-blue-600' }
      ]
    : [
        { label: 'Received', value: paymentHistory.length, color: 'text-blue-600' }
      ];

  return (
    <div className="page-container">
      <div className="mb-8">
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
        <h1 className="page-title text-center">{t('yourOrders')}</h1>
        <p className="page-subtitle text-center">{t('manageOrders')}</p>
        {orders.length > 0 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={exportToExcel}
              className="btn btn-primary flex items-center gap-2 text-sm px-4 py-2.5 shadow-lg hover:shadow-xl transition-all"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        )}
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
          <Package className="inline w-4 h-4 mr-1 -mt-0.5" /> Order List ({allOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <CreditCard className="inline w-4 h-4 mr-1 -mt-0.5" /> Transaction History ({paymentHistory.length})
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
              <OrderCard 
                order={order} 
                actions={activeTab === 'active' ? getActions(order) : null} 
                showOtp={true} 
                pickupOtp={order.pickupOtp}
                onClick={() => {
                  setSelectedOrder(order);
                  setModalOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      )}
      {/* Status Tracker Modal (unified with retailer style) */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        {selectedOrder && (
          <>
            <OrderCard
              order={selectedOrder}
              actions={getActions(selectedOrder)}
              showOtp={true}
              pickupOtp={selectedOrder.pickupOtp}
              t={t}
            />
            <OrderStatusTracker status={selectedOrder.status} />
          </>
        )}
      </Modal>
    </div>
  );
}
