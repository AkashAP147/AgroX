import { Package, IndianRupee, Store, CreditCard, Clock, CheckCircle2, XCircle, Truck, CircleDollarSign, Star } from 'lucide-react';
import StarRating from './StarRating';

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


export default function OrderCard({ order, actions, showOtp = true, deliveryOtp, pickupOtp, rating, rated, ratingOpen, onOpenRating, onCloseRating, onSubmitRating, ratingLoading, t, onClick }) {
  const StatusIcon = STATUS_ICONS[order.status] || Clock;
  // Prefer pickupOtp prop if provided, else fallback to order.pickupOtp
  const effectivePickupOtp = pickupOtp !== undefined ? pickupOtp : order.pickupOtp;

  return (
    <div className="card group transition-all duration-300 cursor-pointer" onClick={onClick}>
      {/* Header with status badge for farmer */}
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
        <span className={`badge ${STATUS_STYLES[order.status] || 'badge-yellow'}`}
          title={order.status.charAt(0).toUpperCase() + order.status.slice(1)}>
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
        <>
          {/* Always show Pickup OTP for farmer if available and not delivered */}
          {showOtp && effectivePickupOtp && order.status !== 'delivered' && (
            <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2 text-xs text-blue-900">
              <p className="font-semibold text-base text-center tracking-widest">Pickup OTP: <span className="text-lg font-mono">{effectivePickupOtp || 'N/A'}</span></p>
              <p className="text-xs text-gray-500 text-center mt-1">Share this OTP with the transporter to start the pickup.</p>
            </div>
          )}
          {/* Show Delivery OTP for retailer if available and order is shipped but not delivered */}
          {showOtp && deliveryOtp && order.status === 'shipped' && (
            <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2 text-xs text-blue-900">
              <p className="font-semibold text-base text-center tracking-widest">Delivery OTP: <span className="text-lg font-mono">{deliveryOtp || 'N/A'}</span></p>
              <p className="text-xs text-gray-500 text-center mt-1">Share this OTP with the transporter to confirm delivery.</p>
            </div>
          )}
          <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800">
            <p className="font-semibold">Transaction: {order.transactionId || 'N/A'}</p>
            <p>Paid via: {order.paidVia || 'demo-upi@mandi'}</p>
            <p>Paid at: {order.paidAt ? new Date(order.paidAt).toLocaleString('en-IN') : 'N/A'}</p>
          </div>
        </>
      )}

      {/* Rating section inside card */}
      {rating && (
        <div className="mt-2">
          {rated ? (
            <div className="card-static p-3 bg-amber-50/60 border-amber-100">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-semibold text-gray-700">{t('yourRating')}</span>
              </div>
              <StarRating value={rated.rating} totalRatings={1} compact />
              {rated.comment && (
                <p className="text-xs text-gray-500 mt-1.5 italic">"{rated.comment}"</p>
              )}
            </div>
          ) : ratingOpen ? (
            <div className="card-static p-4 border-2 border-amber-200 bg-amber-50/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500" /> {t('rateFarmer')}
                </h4>
                <button
                  type="button"
                  onClick={onCloseRating}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <StarRating
                editable
                loading={ratingLoading}
                onSubmit={onSubmitRating}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenRating}
              className="btn btn-outline w-full text-sm py-2.5 flex items-center justify-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Star className="w-4 h-4" /> {t('rateFarmer')}
            </button>
          )}
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
