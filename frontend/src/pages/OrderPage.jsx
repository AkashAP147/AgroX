import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { createOrder } from '../services/api';
import { Wheat, MapPin, IndianRupee, CheckCircle2, CreditCard, Search, Loader2, ShoppingCart, Package, X, ZoomIn, LocateFixed, MessageCircle, MessageSquare } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import MapPicker from '../components/MapPicker';

export default function OrderPage({ user }) {
  const { t } = useLanguage();
  const { cropId } = useParams();
  const { state } = useLocation();
  const crop = state?.crop;
  const navigate = useNavigate();

  const [quantity, setQuantity] = useState('');
  const [dropLocation, setDropLocation] = useState(user?.location || '');
  const [dropCoordinates, setDropCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [showImage, setShowImage] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationHint, setLocationHint] = useState('');
  const [farmerPhone, setFarmerPhone] = useState(null);
  const [farmerName, setFarmerName] = useState(null);
  const [notifySent, setNotifySent] = useState(false);
  const unit = crop?.quantityUnit || 'kg';

  // Auto-detect live location on mount
  useEffect(() => {
    if (!dropCoordinates) {
      detectLiveLocation();
    }
  }, []);

  async function reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.address?.city || data.address?.town || data.address?.village || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  async function detectLiveLocation() {
    setLocating(true);
    setLocationHint('');
    if (!navigator.geolocation) {
      setLocationHint('Geolocation not available on this device');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        setDropCoordinates(coords);
        const placeName = await reverseGeocode(latitude, longitude);
        setDropLocation(placeName);
        setLocationHint(`📍 ${placeName}`);
        setLocating(false);
      },
      () => {
        setLocationHint('Could not detect location. Please enter manually or pick on map.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (!crop) {
    return (
      <div className="page-container text-center py-20">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">{t('cropNotFound')}</p>
        <p className="text-gray-400 text-sm mt-1 mb-4">{t('cropMayNotAvail')}</p>
        <button onClick={() => navigate('/marketplace')} className="btn btn-primary">
          {t('backToMarketplace')}
        </button>
      </div>
    );
  }

  const total = quantity ? Number(quantity) * crop.price : 0;

  async function handleOrder(e) {
    e.preventDefault();
    if (!dropCoordinates) {
      setMessage('Please pick the delivery location on the map for correct navigation.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const data = await createOrder({
        cropId: crop._id,
        retailerId: user._id,
        retailerName: user.name,
        quantity: Number(quantity),
        dropLocation,
        dropCoordinates
      });
      setMessage('Order placed!');
      setOrderId(data.order._id);
      if (data.farmerPhone) setFarmerPhone(data.farmerPhone);
      if (data.farmerName) setFarmerName(data.farmerName);
    } catch (err) {
      setMessage(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="page-container max-w-xl">
      <MapPicker
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelectLocation={({ name, coords }) => {
          setDropLocation(name);
          setDropCoordinates(coords);
        }}
        initialCoords={dropCoordinates}
        title="Select Delivery Location"
      />

      {/* Image Popup via Portal */}
      {showImage && crop.image && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6 animate-fade-in"
          onClick={() => setShowImage(false)}
        >
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowImage(false)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={crop.image}
              alt={crop.cropName}
              className="w-full max-h-[60vh] object-contain bg-gray-50"
            />
            <div className="p-3 border-t border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{crop.cropName}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {crop.location}
                </p>
              </div>
              <span className="text-sm font-bold text-primary-700 flex items-center gap-0.5">
                <IndianRupee className="w-3.5 h-3.5" />{crop.price}/{unit}
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="mb-8">
        <h1 className="page-title">{t('placeOrder')}</h1>
        <p className="page-subtitle">{t('reviewCrop')}</p>
      </div>

      {/* Crop Summary */}
      <div className="card-static mb-6 overflow-hidden bg-gradient-to-br from-primary-50/50 to-white border-primary-100">
        {/* Crop image */}
        {crop.image ? (
          <div className="relative -mx-5 -mt-5 mb-4 cursor-pointer group/img" onClick={() => setShowImage(true)}>
            <img src={crop.image} alt={crop.cropName} className="w-full h-44 object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
              <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-4 text-white">
              <h2 className="text-xl font-bold drop-shadow-sm">{crop.cropName}</h2>
              <p className="text-sm opacity-90 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5" /> {crop.location}
                {crop.farmerName && <span className="opacity-75">• By {crop.farmerName}</span>}
              </p>
            </div>
            <div className="absolute bottom-3 right-4 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-primary-700 text-sm font-bold flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" />{crop.price}/{unit}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Wheat className="w-7 h-7 text-primary-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{crop.cropName}</h2>
              <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {crop.location} {crop.farmerName && <span className="text-gray-400">• By {crop.farmerName}</span>}
                </p>
                <p className="flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5" /> {crop.price}/{unit} • {crop.quantity} {unit} available
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Details row when image is shown */}
        {crop.image && (
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-gray-400" /> {crop.quantity} {unit} available
            </span>
            {crop.farmerName && (
              <span className="flex items-center gap-1.5">
                <Wheat className="w-4 h-4 text-gray-400" /> {crop.farmerName}
              </span>
            )}
          </div>
        )}
      </div>

      {orderId ? (
        <div className="card-static text-center py-8 animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{t('orderPlaced')}</h2>
          <p className="text-gray-500 mb-5">{t('total')}: <span className="font-bold text-primary-700">₹{total.toLocaleString('en-IN')}</span></p>

          {/* Notify Farmer Section */}
          {farmerPhone && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 text-left">
              <p className="text-sm font-semibold text-green-800 mb-1 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Notify Farmer about this Order
              </p>
              <p className="text-xs text-green-700 mb-3">
                Send order details to <span className="font-bold">{farmerName || 'farmer'}</span> via WhatsApp or SMS from your number
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const msg = `🌾 *New Order from AgroX!*\n\nHello ${farmerName || 'Farmer'},\n*${user.name}* has placed an order.\n\n📦 *Crop:* ${crop.cropName}\n📊 *Qty:* ${quantity} ${unit}\n💰 *Price:* ₹${crop.price}/${unit}\n💵 *Total:* ₹${total.toLocaleString('en-IN')}\n\n🏪 *Retailer:* ${user.name}\n📞 *Contact:* +91${user.phone || ''}\n📍 *Deliver to:* ${dropLocation}\n\n🔔 Please accept/reject this order in the AgroX app.`;
                    window.open(`https://wa.me/91${farmerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                    setNotifySent(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
                <button
                  onClick={() => {
                    const msg = `New Order from AgroX! ${user.name} ordered ${quantity} ${unit} of ${crop.cropName} at Rs.${crop.price}/${unit}. Total: Rs.${total}. Deliver to: ${dropLocation}. Contact retailer: +91${user.phone || ''}. Accept/reject in AgroX app.`;
                    window.open(`sms:+91${farmerPhone}?body=${encodeURIComponent(msg)}`, '_self');
                    setNotifySent(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> SMS
                </button>
              </div>
              {notifySent && (
                <p className="text-xs text-green-700 font-medium mt-2 text-center">✅ Notification sent to farmer!</p>
              )}
            </div>
          )}

          <button onClick={() => navigate(`/payment/${orderId}`, { state: { total } })}
            className="btn btn-primary text-lg py-4 px-8 shadow-lg shadow-primary-200 w-full">
            <CreditCard className="w-5 h-5" /> {t('payNow')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleOrder} className="card-static p-6 sm:p-8 space-y-5">
          <div>
            <label className="label">{t('quantity')} ({unit})</label>
            <input type="number" className="input" placeholder={t('howMuch')}
              value={quantity} onChange={e => setQuantity(e.target.value)}
              min="1" max={crop.quantity} required />
            <p className="text-xs text-gray-400 mt-1.5">{t('maxAvailable')} {crop.quantity} {unit}</p>
          </div>
          <div>
            <label className="label">{t('deliveryLocation')}</label>
            <input className="input" placeholder={t('warehouseShop')}
              value={dropLocation} onChange={e => setDropLocation(e.target.value)} required />
            {locationHint && (
              <p className="text-xs text-emerald-600 mt-1.5 font-medium">{locationHint}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="btn btn-secondary"
              >
                <MapPin className="w-4 h-4" /> Pick on map
              </button>
              <button
                type="button"
                onClick={detectLiveLocation}
                disabled={locating}
                className="btn btn-secondary"
              >
                <LocateFixed className="w-4 h-4" /> {locating ? 'Detecting...' : 'Detect via GPS'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {dropCoordinates
                ? `Coordinates: ${dropCoordinates.lat.toFixed(4)}, ${dropCoordinates.lng.toFixed(4)}`
                : 'Select exact coordinates for correct navigation'}
            </p>
          </div>

          {/* Price Preview */}
          {total > 0 && (
            <div className="bg-primary-50 rounded-2xl p-5 text-center animate-scale-in border border-primary-100">
              <p className="text-xs text-gray-500 mb-1">{t('estimatedTotal')}</p>
              <p className="text-3xl font-extrabold text-primary-700">₹{total.toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-400 mt-1">{quantity} {unit} × ₹{crop.price}/{unit}</p>
            </div>
          )}

          {message && !orderId && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-scale-in">
              {message}
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full text-lg py-4" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> {t('placingOrder')}
              </span>
            ) : (
              <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> {t('confirmOrder')}</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
