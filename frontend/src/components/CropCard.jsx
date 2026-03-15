import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Package, IndianRupee, MapPin, Calendar, Check, AlertCircle, Wheat, X, ZoomIn } from 'lucide-react';
import StarRating from './StarRating';

export default function CropCard({ crop, actionLabel, onAction }) {
  const available = new Date(crop.availableUntil) > new Date();
  const unit = crop.quantityUnit || 'kg';
  const [showImage, setShowImage] = useState(false);
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

      <div className="card group hover:-translate-y-1 transition-all duration-300 overflow-hidden">
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
        <span className={`absolute top-2 right-2 badge ${available ? 'badge-green' : 'badge-red'}`}>
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
          <span className="font-medium">{crop.quantity} {unit}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
          <IndianRupee className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="font-medium">{crop.price}/{unit}</span>
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

      {/* Action Button */}
      {actionLabel && available && (
        <button onClick={() => onAction(crop)}
          className="btn btn-primary w-full mt-1 text-sm py-2.5">
          {actionLabel}
        </button>
      )}
    </div>
    </>
  );
}
