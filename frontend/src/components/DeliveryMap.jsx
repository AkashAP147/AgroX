import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ─── Icon builders ────────────────────────────────────────────── */
function pinIcon(color) {
  return L.divIcon({
    className: '',
    iconSize: [28, 40], iconAnchor: [14, 40], popupAnchor: [0, -44],
    html: `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>`
  });
}

function truckIcon(heading = 0) {
  return L.divIcon({
    className: '',
    iconSize: [42, 42], iconAnchor: [21, 21], popupAnchor: [0, -24],
    html: `<div style="transform:rotate(${heading}deg);width:42px;height:42px;display:flex;align-items:center;justify-content:center">
      <svg width="42" height="42" viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
        <circle cx="21" cy="21" r="19" fill="#1d4ed8" stroke="white" stroke-width="2.5"/>
        <circle cx="21" cy="21" r="17" fill="#1d4ed8" fill-opacity="0.2">
          <animate attributeName="r" from="14" to="22" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="fill-opacity" from="0.35" to="0" dur="2s" repeatCount="indefinite"/>
        </circle>
        <polygon points="21,8 27,26 21,22 15,26" fill="white"/>
      </svg>
    </div>`
  });
}

const pickupIcon  = pinIcon('#16a34a');
const dropoffIcon = pinIcon('#dc2626');

/* ─── Haversine distance (km) ──────────────────────────────────── */
function haversine(a, b) {
  if (!a || !b) return null;
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180,
        dLng = (b.lng - a.lng) * Math.PI / 180,
        s = Math.sin(dLat / 2) ** 2 +
            Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/* ─── Bearing degrees ──────────────────────────────────────────── */
function bearing(a, b) {
  if (!a || !b) return 0;
  const dLng = (b.lng - a.lng) * Math.PI / 180,
        lat1 = a.lat * Math.PI / 180, lat2 = b.lat * Math.PI / 180,
        y = Math.sin(dLng) * Math.cos(lat2),
        x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

/* ─── Map helpers ──────────────────────────────────────────────── */
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
    }
  }, [JSON.stringify(points)]); // eslint-disable-line
  return null;
}

function FollowLive({ position, follow }) {
  const map = useMap();
  const prevRef = useRef(null);
  useEffect(() => {
    if (!position || !follow) return;
    if (prevRef.current) {
      map.panTo([position.lat, position.lng], { animate: true, duration: 0.6 });
    }
    prevRef.current = position;
  }, [position, follow]); // eslint-disable-line
  return null;
}

/* ─── Main component ───────────────────────────────────────────── */
export default function DeliveryMap({ pickup, dropoff, showLive = false, height = '220px', pickupLabel, dropoffLabel }) {
  const [livePos,       setLivePos]       = useState(null);
  const [heading,       setHeading]       = useState(0);
  const [speed,         setSpeed]         = useState(null); // km/h
  const [route,         setRoute]         = useState([]);   // OSRM decoded polyline
  const [routeDist,     setRouteDist]     = useState(null); // km
  const [routeETA,      setRouteETA]      = useState(null); // minutes
  const [follow,        setFollow]        = useState(true);
  const [fullscreen,    setFullscreen]    = useState(false);
  const watchRef = useRef(null);
  const prevPosRef = useRef(null);
  const routeTimerRef = useRef(null);

  /* GPS watch */
  useEffect(() => {
    if (!showLive || !navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (pos.coords.speed != null) setSpeed((pos.coords.speed * 3.6).toFixed(0));
        if (pos.coords.heading != null && pos.coords.heading >= 0) {
          setHeading(pos.coords.heading);
        } else if (prevPosRef.current) {
          setHeading(bearing(prevPosRef.current, next));
        }
        prevPosRef.current = next;
        setLivePos(next);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
    return () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); };
  }, [showLive]);

  /* Fetch OSRM road route */
  const fetchRoute = useCallback(async (from, to) => {
    if (!from || !to) return;
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const leg = data.routes?.[0];
      if (!leg) return;
      setRoute(leg.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
      setRouteDist((leg.distance / 1000).toFixed(1));
      setRouteETA(Math.ceil(leg.duration / 60));
    } catch { /* offline / CORS – fallback to straight line */ }
  }, []);

  useEffect(() => {
    const routeStart = showLive && livePos ? livePos : pickup;
    if (!routeStart || !dropoff) return;
    clearTimeout(routeTimerRef.current);
    routeTimerRef.current = setTimeout(() => {
      fetchRoute(routeStart, dropoff);
    }, showLive && livePos ? 350 : 0);
    return () => clearTimeout(routeTimerRef.current);
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, livePos?.lat, livePos?.lng, showLive, fetchRoute]);

  /* Google Maps deep-link */
  const gmapsUrl = () => {
    const parts = [];
    if (pickup)  parts.push(`${pickup.lat},${pickup.lng}`);
    if (livePos) parts.push(`${livePos.lat},${livePos.lng}`);
    if (dropoff) parts.push(`${dropoff.lat},${dropoff.lng}`);
    if (parts.length >= 2) return `https://www.google.com/maps/dir/${parts.join('/')}`;
    if (pickup)  return `https://www.google.com/maps/search/?api=1&query=${pickup.lat},${pickup.lng}`;
    return null;
  };

  const center = livePos || pickup || dropoff || { lat: 20.5937, lng: 78.9629 };
  const boundsPoints = [pickup, dropoff, livePos].filter(Boolean);
  const liveMarkerIcon = truckIcon(heading);

  /* straight-line fallback shown only when OSRM failed */
  const routeStart = showLive && livePos ? livePos : pickup;
  const fallbackLine = route.length === 0 ? [
    routeStart && [routeStart.lat, routeStart.lng],
    dropoff && [dropoff.lat, dropoff.lng],
  ].filter(Boolean) : [];

  /* remaining distance from live position to dropoff */
  const remainKm = livePos && dropoff
    ? (haversine(livePos, dropoff) || 0).toFixed(1)
    : routeDist;

  const wrapClass = fullscreen
    ? 'fixed inset-0 z-[9999] flex flex-col bg-gray-900'
    : 'relative rounded-xl overflow-hidden border border-gray-200/60 shadow-md';

  return (
    <div className={wrapClass}>
      {/* ── Top nav bar (only in live mode) ── */}
      {showLive && (
        <div className={`${fullscreen ? '' : 'absolute top-2 left-2 right-2 z-[1000]'} flex items-center gap-2`}>
          {/* Stats pill */}
          <div className="flex items-center gap-3 bg-gray-900/90 backdrop-blur text-white text-xs font-semibold rounded-full px-3 py-1.5 shadow-lg flex-1">
            {/* Speed */}
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              {speed != null ? `${speed} km/h` : '-- km/h'}
            </span>
            <span className="text-gray-500">|</span>
            {/* Distance */}
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              {remainKm != null ? `${remainKm} km` : '-- km'}
            </span>
            <span className="text-gray-500">|</span>
            {/* ETA */}
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {routeETA != null ? `~${routeETA} min` : '-- min'}
            </span>
          </div>

          {/* Follow toggle */}
          <button
            onClick={() => setFollow(f => !f)}
            title={follow ? 'Stop following' : 'Follow my location'}
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition ${follow ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setFullscreen(f => !f)}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen navigation'}
            className="w-8 h-8 rounded-full bg-white text-gray-700 flex items-center justify-center shadow-lg"
          >
            {fullscreen
              ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
            }
          </button>
        </div>
      )}

      {/* ── Map ── */}
      <div style={{ height: fullscreen ? '100%' : height, width: '100%', flex: fullscreen ? 1 : undefined }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <FitBounds points={boundsPoints} />
          <FollowLive position={livePos} follow={showLive && follow} />

          {pickup && (
            <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
              <Popup><span className="text-xs font-semibold text-green-700">📦 {pickupLabel || 'Pickup'}</span></Popup>
            </Marker>
          )}
          {dropoff && (
            <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
              <Popup><span className="text-xs font-semibold text-red-700">🏁 {dropoffLabel || 'Drop-off'}</span></Popup>
            </Marker>
          )}
          {showLive && livePos && (
            <Marker position={[livePos.lat, livePos.lng]} icon={liveMarkerIcon}>
              <Popup><span className="text-xs font-semibold text-blue-700">🚛 You are here{speed != null ? ` · ${speed} km/h` : ''}</span></Popup>
            </Marker>
          )}

          {/* OSRM road route */}
          {route.length >= 2 && (
            <Polyline positions={route} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }} />
          )}
          {/* Straight-line fallback */}
          {fallbackLine.length >= 2 && (
            <Polyline positions={fallbackLine} pathOptions={{ color: '#2563eb', weight: 3, opacity: 0.6, dashArray: '8 6' }} />
          )}
        </MapContainer>
      </div>

      {/* ── Bottom bar: Google Maps launch ── */}
      {showLive && (
        <div className={`${fullscreen ? 'p-3 bg-gray-900' : 'absolute bottom-2 left-2 right-2 z-[1000]'} flex gap-2`}>
          {gmapsUrl() && (
            <a
              href={gmapsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 flex-1 py-2 px-3 rounded-xl bg-white text-gray-800 text-xs font-semibold shadow-lg hover:bg-gray-50 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
              Open in Google Maps
            </a>
          )}
          {!livePos && (
            <div className="flex items-center gap-1.5 flex-1 justify-center py-2 px-3 rounded-xl bg-amber-50/90 text-amber-700 text-xs font-medium shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Acquiring GPS signal…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
