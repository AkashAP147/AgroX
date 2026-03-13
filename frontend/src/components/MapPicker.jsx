import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, Loader2, LocateFixed, Check } from 'lucide-react';

// Fix default marker icon issue with webpack/vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1 });
    }
  }, [position, map]);
  return null;
}

export default function MapPicker({ isOpen, onClose, onSelectLocation, initialCoords, title = 'Select Pickup Location' }) {
  const [selectedPos, setSelectedPos] = useState(initialCoords || null);
  const [locationName, setLocationName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);

  const defaultCenter = initialCoords || { lat: 20.5937, lng: 78.9629 }; // India center
  const defaultZoom = initialCoords ? 14 : 5;

  useEffect(() => {
    if (isOpen && initialCoords) {
      setSelectedPos(initialCoords);
      reverseGeocode(initialCoords.lat, initialCoords.lng);
    }
  }, [isOpen]);

  async function reverseGeocode(lat, lng) {
    setResolving(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const name = addr.village || addr.town || addr.city || addr.suburb || addr.county ||
        data.display_name?.split(',').slice(0, 2).join(',') || '';
      setLocationName(name.trim());
    } catch {
      setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
    setResolving(false);
  }

  function handleMapClick(latlng) {
    setSelectedPos(latlng);
    reverseGeocode(latlng.lat, latlng.lng);
  }

  function handleMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setSelectedPos(latlng);
        reverseGeocode(latlng.lat, latlng.lng);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleConfirm() {
    if (selectedPos && locationName) {
      onSelectLocation({
        name: locationName,
        coords: { lat: selectedPos.lat, lng: selectedPos.lng }
      });
      onClose();
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-3 sm:p-6 animate-fade-in"
      onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-lg max-h-[85vh] flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-600" /> {title}
          </h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Map */}
        <div className="flex-1 min-h-[300px] sm:min-h-[350px] relative">
          <MapContainer
            center={[defaultCenter.lat, defaultCenter.lng]}
            zoom={defaultZoom}
            className="w-full h-full"
            style={{ minHeight: '300px' }}
          >
            <TileLayer
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              pane="overlayPane"
            />
            <ClickHandler onMapClick={handleMapClick} />
            {selectedPos && (
              <>
                <Marker position={[selectedPos.lat, selectedPos.lng]} />
                <FlyToLocation position={[selectedPos.lat, selectedPos.lng]} />
              </>
            )}
          </MapContainer>

          {/* My Location button */}
          <button type="button" onClick={handleMyLocation}
            className="absolute bottom-3 right-3 z-[1000] bg-white shadow-lg rounded-xl px-3 py-2 flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50 transition-colors border border-gray-200"
            disabled={locating}>
            {locating
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <LocateFixed className="w-3.5 h-3.5" />
            }
            My Location
          </button>

          {/* Tap hint */}
          {!selectedPos && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm shadow-md rounded-lg px-3 py-1.5 text-xs text-gray-600 font-medium">
              Tap on the map to select location
            </div>
          )}
        </div>

        {/* Footer — selected location + confirm */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          {selectedPos ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                {resolving ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Resolving address...
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-900 truncate">{locationName}</p>
                    <p className="text-[11px] text-gray-400">
                      {selectedPos.lat.toFixed(5)}, {selectedPos.lng.toFixed(5)}
                    </p>
                  </>
                )}
              </div>
              <button type="button" onClick={handleConfirm}
                disabled={resolving || !locationName}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors">
                <Check className="w-4 h-4" /> Confirm
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center">No location selected</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
