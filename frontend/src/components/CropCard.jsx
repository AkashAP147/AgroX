import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { updateCrop } from '../services/api';
import { createPortal } from 'react-dom';
import { Package, IndianRupee, MapPin, Calendar, Check, AlertCircle, Wheat, X, ZoomIn } from 'lucide-react';
import StarRating from './StarRating';
import { Trash2, Pencil } from 'lucide-react';

export default function CropCard({ crop, actionLabel, onAction, onDelete, onEdit, onAfterEdit, isFarmer }) {
  if (!crop) return null;
  const available = new Date(crop.availableUntil) > new Date();
  const unit = crop.quantityUnit || 'kg';
  const [showImage, setShowImage] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(crop.price);
  const [editQuantity, setEditQuantity] = useState(crop.quantity);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  async function handleSaveEdit() {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await updateCrop(crop._id, { price: editPrice, quantity: editQuantity });
      setEditing(false);
      setSuccess(true);
      if (onAfterEdit) onAfterEdit();
      setTimeout(() => setSuccess(false), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
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

      <div className="card group hover:-translate-y-1 transition-all duration-300 overflow-hidden relative">
        {/* Edit and Delete Icons for FarmerDashboard */}
        {isFarmer && (
          <div className="absolute top-2 right-2 z-20 flex gap-2">
            {!editing && (
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-1 shadow-lg transition-colors"
                title="Edit crop"
                onClick={() => setEditing(true)}
                style={{ lineHeight: 0 }}
              >
                <Pencil className="w-5 h-5" />
              </button>
            )}
            {onDelete && (
              <button
                className="bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-lg transition-colors"
                title="Delete crop"
                onClick={onDelete}
                style={{ lineHeight: 0 }}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        {/* Crop Image / Placeholder */}
        <div className="relative -mx-5 -mt-5 mb-4">
          {crop.image ? (
            <div className="relative cursor-pointer" onClick={() => setShowImage(true)}>
              <img src={crop.image} alt={crop.cropName} className="w-full h-40 object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <ZoomIn className="w-5 h-5 text-gray-700" />
                </div>
              </div>
            </div>
          ) : (
          <div className="w-full h-40 bg-gradient-to-br from-primary-50 via-primary-100/50 to-emerald-50 flex items-center justify-center">
            <div className="text-center">
              <Wheat className="w-10 h-10 text-primary-300 mx-auto mb-1" />
              <span className="text-xs text-primary-300 font-medium">No photo</span>
            </div>
          </div>
        )}
        <span className={`absolute top-2 left-2 badge ${available ? 'badge-green' : 'badge-red'}`}>
          {available
            ? <><Check className="w-3 h-3 inline -mt-0.5 mr-0.5" /> Available</>
            : <><AlertCircle className="w-3 h-3 inline -mt-0.5 mr-0.5" /> Expired</>
          }
        </span>
        {/* Price tag overlay */}
        <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-sm font-bold flex items-center gap-1">
          <IndianRupee className="w-3.5 h-3.5" />{crop.price}/{unit}
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-700 transition-colors">
            {crop.cropName}
          </h3>
          {crop.farmerName && (
            <div>
              <p className="text-xs text-gray-400 mt-0.5">by {crop.farmerName}</p>
              <StarRating value={crop.farmerRating || 0} totalRatings={crop.farmerTotalRatings || 0} compact />
            </div>
          )}
        </div>
        <span className={`badge ${available ? 'badge-green' : 'badge-red'} hidden`}>
          {available
            ? <><Check className="w-3 h-3 inline -mt-0.5 mr-0.5" /> Available</>
            : <><AlertCircle className="w-3 h-3 inline -mt-0.5 mr-0.5" /> Expired</>
          }
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {isFarmer && editing ? (
            <input
              type="number"
              className="input input-xs w-24"
              value={editQuantity}
              min={1}
              onChange={e => setEditQuantity(e.target.value)}
              disabled={saving}
              autoFocus
            />
          ) : (
            <span className="font-medium">{crop.quantity} {unit}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <IndianRupee className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {isFarmer && editing ? (
            <input
              type="number"
              className="input input-xs w-24"
              value={editPrice}
              min={1}
              onChange={e => setEditPrice(e.target.value)}
              disabled={saving}
            />
          ) : (
            <span className="font-medium">{crop.price}/{unit}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="font-medium truncate">{crop.location}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="font-medium">{new Date(crop.availableUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      {/* Edit Save/Cancel Buttons */}
      {isFarmer && editing && (
        <div className="flex gap-2 mt-2 items-center">
          <button className="btn btn-xs btn-primary flex items-center gap-1" onClick={handleSaveEdit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button className="btn btn-xs btn-gray" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </button>
          {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
          {success && <span className="text-xs text-green-600 ml-2">Saved!</span>}
        </div>
      )}
      {/* Action Button */}
      {actionLabel && available && !editing && (
        <button onClick={() => onAction(crop)}
          className="btn btn-primary w-full mt-1 text-sm py-2.5">
          {actionLabel}
        </button>
      )}
    </div>
    </>
  );
}
