import { Package, IndianRupee, Store, CreditCard, Clock, CheckCircle2, XCircle, Truck, CircleDollarSign } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'badge-yellow',
  accepted: 'badge-green',
  rejected: 'badge-red',
  paid: 'badge-blue',
  shipped: 'badge-blue',
  delivered: 'badge-green',
  unpaid: 'badge-yellow'
};

const STATUS_ICONS = {
  pending: Clock,
  accepted: CheckCircle2,
  rejected: XCircle,
  paid: CreditCard,
  shipped: Truck,
  delivered: Package,
  unpaid: Clock
};

export default function OrderCard({ order, actions }) {
  const StatusIcon = STATUS_ICONS[order.status] || Clock;

  return (
    <div className="card group hover:-translate-y-1 transition-all duration-300">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-700 transition-colors">
            {order.cropName || 'Order'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </p>
        </div>
        <span className={`badge ${STATUS_STYLES[order.status] || 'badge-yellow'}`}>
          <StatusIcon className="w-3 h-3 inline -mt-0.5 mr-0.5" /> {order.status}
        </span>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="font-medium">{order.quantity} kg</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <IndianRupee className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="font-medium">{order.totalPrice?.toLocaleString('en-IN')}</span>
        </div>
        {order.retailerName && (
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
            <Store className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium truncate">{order.retailerName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <CircleDollarSign className="w-4 h-4 flex-shrink-0" />
          <span className={`font-medium ${order.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
            {order.paymentStatus}
          </span>
        </div>
      </div>

      {order.paymentStatus === 'paid' && (
        <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800">
          <p className="font-semibold">Transaction: {order.transactionId || 'N/A'}</p>
          <p>Paid via: {order.paidVia || 'demo-upi@mandi'}</p>
          <p>Paid at: {order.paidAt ? new Date(order.paidAt).toLocaleString('en-IN') : 'N/A'}</p>
        </div>
      )}

      {/* Actions */}
      {actions && (
        <div className="flex gap-2 mt-1 flex-wrap">
          {actions.map((a, i) => (
            <button key={i} onClick={() => a.onClick(order)}
              className={`btn text-sm py-2 px-4 flex-1 ${a.className || 'btn-primary'}`}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
