import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addCrop } from '../services/api';
import { savePendingCrop } from '../services/offlineDB';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { WifiOff, Loader2, Wheat, Leaf, Cherry, CircleDot, Citrus, Apple, Grape, TreePalm, Flame, Flower2, HelpCircle, Save, Camera, X, ImageIcon, MapPin, LocateFixed, Pencil, Check, Map } from 'lucide-react';
import MapPicker from '../components/MapPicker';
import { useLanguage } from '../context/LanguageContext';

const CROP_OPTIONS = [
  { name: 'Rice', Icon: Wheat },
  { name: 'Wheat', Icon: Wheat },
  { name: 'Tomato', Icon: Cherry },
  { name: 'Onion', Icon: CircleDot },
  { name: 'Potato', Icon: Citrus },
  { name: 'Mango', Icon: Apple },
  { name: 'Banana', Icon: Grape },
  { name: 'Sugarcane', Icon: TreePalm },
  { name: 'Chilli', Icon: Flame },
  { name: 'Cotton', Icon: Flower2 },
  { name: 'Other', Icon: HelpCircle }
];

export default function AddCrop({ user }) {
  const { t } = useLanguage();
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    cropName: '', quantity: '', price: '', location: user.location || '', availableUntil: '', quantityUnit: 'kg'
  });
  const [customCrop, setCustomCrop] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [image, setImage] = useState(null);
  const [showImageChoice, setShowImageChoice] = useState(false);
  const cameraInputRef = useRef(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | loading | success | error
  const [manualLocation, setManualLocation] = useState(false);
  const [coords, setCoords] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!form.location || form.location === user.location) {
      fetchGPSLocation();
    }
  }, []);

  async function fetchGPSLocation() {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setManualLocation(true);
      return;
    }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=14&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const location = addr.village || addr.town || addr.city || addr.suburb || addr.county || data.display_name?.split(',').slice(0, 2).join(',') || '';
          if (location) {
            update('location', location.trim());
            setGpsStatus('success');
          } else {
            setGpsStatus('error');
            setManualLocation(true);
          }
        } catch {
          setGpsStatus('error');
          setManualLocation(true);
        }
      },
      () => {
        setGpsStatus('error');
        setManualLocation(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleImageCapture(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setImage(compressed);
    setShowImageChoice(false);
  }

  function removeImage() {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleNumericChange(field, value) {
    // Allow empty or values being typed (restrict to max 2 decimal places)
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      update(field, value);
    }
  }

  function roundToStep(field) {
    const val = parseFloat(form[field]);
    if (isNaN(val)) return;
    const rounded = (Math.round(val * 20) / 20).toFixed(2);
    update(field, rounded);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validate availableUntil is in the future
    const now = new Date();
    const availableUntilDate = new Date(form.availableUntil);
    if (!form.availableUntil || isNaN(availableUntilDate.getTime()) || availableUntilDate <= now) {
      setLoading(false);
      setMessage('error:Please select a future date and time for availability.');
      return;
    }

    const cropData = {
      cropName: form.cropName === 'Other' ? customCrop : form.cropName,
      quantity: Number(form.quantity),
      quantityUnit: form.quantityUnit,
      price: Number(form.price),
      farmerId: user._id,
      farmerName: user.name,
      location: form.location,
      availableUntil: form.availableUntil,
      image: image || null,
      coordinates: coords || undefined
    };

    if (online) {
      try {
        await addCrop(cropData);
        setMessage('success:Crop listed successfully!');
        setTimeout(() => navigate('/farmer'), 1500);
      } catch (err) {
        setMessage('error:' + err.message);
      }
    } else {
      await savePendingCrop({ ...cropData, localId: Date.now().toString() });
      setMessage('offline:Saved offline. Will sync when online.');
      setTimeout(() => navigate('/farmer'), 1500);
    }
    setLoading(false);
  }

  const msgType = message.split(':')[0];
  const msgText = message.split(':').slice(1).join(':');

  return (
    <div className="page-container max-w-xl relative">
      <div className="mb-8 pt-2 sm:pt-0">
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
        <h1 className="page-title text-center">{t('addCrop')}</h1>
        <p className="page-subtitle text-center">{t('listProduce')}</p>
      </div>

      {/* Offline banner */}
      {!online && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-800 mb-6 text-sm animate-scale-in">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <WifiOff className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold">{t('youreOffline')}</p>
            <p className="text-xs opacity-70">{t('cropSavedLocally')}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card-static p-6 sm:p-8 space-y-5">
        {/* Crop Name */}
        <div>
          <label className="label">{t('cropName')}</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {CROP_OPTIONS.map(c => (
              <button type="button" key={c.name}
                onClick={() => update('cropName', c.name)}
                className={`chip text-sm py-2.5 flex items-center justify-center gap-1.5
                  ${form.cropName === c.name ? 'chip-active' : 'chip-inactive'}`}>
                <c.Icon className="w-4 h-4" /> {c.name}
              </button>
            ))}
          </div>
          {form.cropName === 'Other' && (
            <input className="input mt-3 animate-scale-in" placeholder="Enter crop name"
              value={customCrop} onChange={e => setCustomCrop(e.target.value)} required />
          )}
        </div>

        {/* Crop Photo */}
        <div>
          <label className="label">{t('cropPhoto')}</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageCapture}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageCapture}
            className="hidden"
          />
          {image ? (
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 animate-scale-in">
              <img src={image} alt="Crop preview" className="w-full h-48 object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1">
                <Camera className="w-3 h-3" /> {t('photoAdded')}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowImageChoice(true)}
              className="w-full py-8 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center gap-2 text-gray-400 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50/50 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">{t('tapToPhoto')}</span>
              <span className="text-xs opacity-60">{t('chooseGallery')}</span>
            </button>
          )}
          {showImageChoice && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40" onClick={() => setShowImageChoice(false)}>
              <div className="bg-white rounded-xl shadow-xl p-6 flex flex-col gap-4 min-w-[220px]" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="w-full px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary-700"
                  onClick={() => { setShowImageChoice(false); setTimeout(() => cameraInputRef.current?.click(), 100); }}
                >
                  <Camera className="w-4 h-4" /> Take a Photo
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 rounded-lg bg-primary-100 text-primary-700 font-semibold flex items-center justify-center gap-2 hover:bg-primary-200"
                  onClick={() => { setShowImageChoice(false); setTimeout(() => fileInputRef.current?.click(), 100); }}
                >
                  <ImageIcon className="w-4 h-4" /> Upload from Device
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium flex items-center justify-center gap-2 hover:bg-gray-200"
                  onClick={() => setShowImageChoice(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quantity & Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t('quantity')}</label>
            <input type="text" inputMode="decimal" className="input" placeholder="e.g. 500"
              value={form.quantity} onChange={e => handleNumericChange('quantity', e.target.value)}
              onBlur={() => roundToStep('quantity')} required />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['kg', 'quintal', 'ton', 'bag', 'crate'].map(u => (
                <button type="button" key={u}
                  onClick={() => update('quantityUnit', u)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all
                    ${form.quantityUnit === u
                      ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{t('pricePerUnit')} {form.quantityUnit} (₹)</label>
            <input type="text" inputMode="decimal" className="input" placeholder="e.g. 25"
              value={form.price} onChange={e => handleNumericChange('price', e.target.value)}
              onBlur={() => roundToStep('price')} required />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="label">{t('pickupLocation')}</label>

          {/* GPS status banner */}
          {gpsStatus === 'loading' && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-700 text-sm mb-3 animate-scale-in">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              <span>{t('detectingLocation')}</span>
            </div>
          )}

          {gpsStatus === 'success' && !manualLocation && (
            <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-sm mb-3 animate-scale-in">
              <div className="flex items-center gap-2">
                <LocateFixed className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium truncate">{form.location}</span>
              </div>
              <button type="button" onClick={() => setManualLocation(true)}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex-shrink-0">
                <Pencil className="w-3 h-3" /> {t('edit')}
              </button>
            </div>
          )}

          {gpsStatus === 'error' && (
            <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 text-sm mb-3 animate-scale-in">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{t('couldntDetect')}</span>
              </div>
              <button type="button" onClick={fetchGPSLocation}
                className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors flex-shrink-0">
                <LocateFixed className="w-3 h-3" /> {t('retry')}
              </button>
            </div>
          )}

          {/* Manual input — shown when GPS fails, user clicks Edit, or GPS hasn't fetched yet */}
          {(manualLocation || gpsStatus === 'idle' || gpsStatus === 'error') && (
            <div className="relative animate-scale-in">
              <input className="input pr-20" placeholder={t('villageMandi')}
                value={form.location} onChange={e => update('location', e.target.value)} required />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button type="button" onClick={() => setShowMap(true)}
                  className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                  title={t('pickOnMap')}>
                  <Map className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => { fetchGPSLocation(); setManualLocation(false); }}
                  className="w-8 h-8 rounded-lg bg-primary-50 hover:bg-primary-100 flex items-center justify-center text-primary-600 transition-colors"
                  title={t('detectViaGPS')}>
                  <LocateFixed className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Editable input when GPS succeeded but user wants to change */}
          {manualLocation && gpsStatus === 'success' && (
            <div className="relative mt-2 animate-scale-in">
              <input className="input pr-20" placeholder={t('editLocation')}
                value={form.location} onChange={e => update('location', e.target.value)} required />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button type="button" onClick={() => setShowMap(true)}
                  className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                  title={t('pickOnMap')}>
                  <Map className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setManualLocation(false)}
                  className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors"
                  title={t('confirm')}>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Available Until (Date & Time) */}
        <div>
          <label className="label">{t('availableUntil')}</label>
          <input type="datetime-local" className="input"
            value={form.availableUntil}
            onChange={e => update('availableUntil', e.target.value)}
            min={new Date().toISOString().slice(0, 16)} required />
          <p className="text-xs text-gray-500 mt-1">Specify the date and time until which this crop is available for pickup today.</p>
        </div>

        {/* Price Preview */}
        {form.quantity && form.price && (
          <div className="bg-primary-50 rounded-2xl p-4 text-center animate-scale-in border border-primary-100">
            <p className="text-xs text-gray-500 mb-1">{t('totalValue')}</p>
            <p className="text-3xl font-extrabold text-primary-700">
              ₹{(Number(form.quantity) * Number(form.price)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-1">{form.quantity} {form.quantityUnit} × ₹{form.price}/{form.quantityUnit}</p>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium animate-scale-in
            ${msgType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              msgType === 'offline' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-red-50 text-red-700 border border-red-200'}`}>
            {msgText}
          </div>
        )}

        {/* Submit */}
        <button type="submit" className="btn btn-primary w-full text-lg py-4" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> {t('saving')}
            </span>
          ) : online ? (
            <span className="flex items-center gap-2"><Leaf className="w-5 h-5" /> {t('listCrop')}</span>
          ) : (
            <span className="flex items-center gap-2"><Save className="w-5 h-5" /> {t('saveOffline')}</span>
          )}
        </button>
      </form>

      {/* Map Picker Popup */}
      <MapPicker
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        initialCoords={coords}
        onSelectLocation={({ name, coords: newCoords }) => {
          update('location', name);
          setCoords(newCoords);
          setGpsStatus('success');
          setManualLocation(false);
        }}
      />
    </div>
  );
}
