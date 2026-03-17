# Mandi-Connect — Project File Reference

> A low-bandwidth, offline-first farm-to-retail marketplace with OTP-based auth, crop management, order lifecycle tracking, delivery logistics with live maps, payment processing, multi-language support, and IndexedDB sync.

---

## Project Structure Overview

```
mandi-connect/
├── backend/          Express.js REST API + MongoDB
└── frontend/         React + Vite PWA
```

---

## Backend (`backend/`)

### Root

| File | Description |
|------|-------------|
| `server.js` | Express entry point — initialises routes, CORS/JSON middleware, MongoDB connection, runs on port 5000 |
| `package.json` | Dependencies (Express, Mongoose, CORS, dotenv) and npm scripts (`start`, `dev`) |
| `.env` | Environment variables: `PORT`, MongoDB Atlas connection URI |

### Config (`backend/config/`)

| File | Description |
|------|-------------|
| `db.js` | Mongoose connection helper — connects to MongoDB, logs status, handles errors |

### Models (`backend/models/`)

| File | Description |
|------|-------------|
| `Farmer.js` | Schema: name, phone (unique · 10-digit), location, timestamps |
| `Retailer.js` | Schema: name, phone (unique · 10-digit), location, timestamps |
| `Transporter.js` | Schema: name, phone (unique · 10-digit), vehicleType, location, timestamps |
| `Crop.js` | Schema: name, quantity, unit (kg/quintal/ton/bag/crate), price, farmer ref, location, coordinates, availability date, image, status (available/sold) |
| `Order.js` | Schema: crop/farmer/retailer refs, quantity, pricing, payment & order status, farmer/transporter payouts, locations |
| `Delivery.js` | Schema: order ref, transporter ref, pickup/drop locations & coordinates, delivery status |

### Controllers (`backend/controllers/`)

| File | Description |
|------|-------------|
| `authController.js` | OTP generation & verification (in-memory, 5-min expiry), registration for all three roles, and login |
| `cropController.js` | `addCrop`, `getFarmerCrops`, `getAllCrops` (marketplace with filters), `syncCrops` (offline batch upload) |
| `orderController.js` | Full order lifecycle: create (validates stock, calculates price, auto-creates delivery), get orders by role, update status, pay, get details |
| `deliveryController.js` | `getPendingDeliveries`, `getTransporterDeliveries`, `acceptDelivery` (assigns transporter), `updateDeliveryStatus` |

### Routes (`backend/routes/`)

| File | Endpoints |
|------|-----------|
| `auth.js` | `POST /send-otp`, `/verify-otp`, `/register/farmer`, `/register/retailer`, `/register/transporter`, `/login` |
| `crops.js` | `POST /add`, `GET /farmer/:farmerId`, `GET /marketplace` (with filters), `POST /sync` |
| `orders.js` | `POST /create`, `GET /farmer/:id`, `GET /retailer/:id`, `GET /:id/details`, `PUT /:id/status`, `POST /:id/pay` |
| `deliveries.js` | `GET /pending`, `GET /transporter/:id`, `PUT /:id/accept`, `PUT /:id/status` |

---

## Frontend (`frontend/`)

### Config / Root

| File | Description |
|------|-------------|
| `index.html` | HTML shell — theme colour, manifest, Google Fonts (Inter), root `<div>` |
| `vite.config.js` | Vite + React plugin + VitePWA (manifest, offline cache, API cache) |
| `tailwind.config.js` | Custom colour palette (primary greens, earth tones), Inter font, component classes |
| `postcss.config.js` | Tailwind CSS + Autoprefixer |
| `package.json` | Dependencies: React, React Router, Leaflet/react-leaflet, Lucide icons, Tailwind |

### Source Entry (`frontend/src/`)

| File | Description |
|------|-------------|
| `main.jsx` | React DOM entry — renders `<App>` into `#root`, imports global styles |
| `App.jsx` | Root router (React Router v6) — all routes for landing, auth, and role dashboards; `ProtectedRoute` wrapper; wraps app in `LanguageContext` |
| `index.css` | Tailwind directives + custom component layer (buttons, cards, badges, form inputs, skeletons, animations) |

### Pages (`frontend/src/pages/`)

| File | Description |
|------|-------------|
| `Landing.jsx` | Hero page — tagline, CTA buttons (Login / Register), gradient background, feature icon strip |
| `Login.jsx` | 3-step OTP login: phone entry → role selection (farmer / retailer / transporter) → OTP verification with resend countdown |
| `Register.jsx` | Role-aware registration form: name, phone, location (manual or map picker), vehicle type for transporters; OTP verified before submission |
| `FarmerDashboard.jsx` | Farmer home — crop count, total value, pending-sync indicator, crop list (online + offline), demand heatmap for popular crops |
| `AddCrop.jsx` | Add-crop form: preset + custom crop names, quantity, unit, price, availability date, GPS/manual location, optional photo; offline-first (IndexedDB), auto-syncs |
| `FarmerOrders.jsx` | Incoming order list for farmer — crop + buyer details, total price, payment/delivery status badges, order timeline |
| `Marketplace.jsx` | Crop browser for retailers — search by name, price range, location; crop cards with Order button |
| `OrderPage.jsx` | Order creation: quantity picker, drop location via map, price summary, farmer/crop details, submit |
| `PaymentPage.jsx` | Payment UI — order summary, payout breakdown (farmer share / transporter fee / platform fee), payment method selection, confirmation |
| `RetailerOrders.jsx` | Retailer purchase history — crop/farmer details, quantities, totals, full status pipeline (pending → accepted → paid → shipped → delivered) |
| `TransporterDashboard.jsx` | Transporter home — stat cards (available / active / completed), available & my-jobs tabs, delivery cards with live navigation map |

### Components (`frontend/src/components/`)

| File | Description |
|------|-------------|
| `Navbar.jsx` | Top nav — logo, role-based links, online/offline badge, language switcher dropdown, logout |
| `CropCard.jsx` | Reusable crop display card — name, quantity, unit, price, farmer, location, date, status badge, action button, image zoom modal |
| `OrderCard.jsx` | Reusable order card — crop/farmer/retailer info, quantity, price, status badges, payment info, payout breakdown, optional action buttons |
| `MapPicker.jsx` | Leaflet modal for picking coordinates — click to place marker, "Locate Me" GPS button, confirm selection |
| `DeliveryMap.jsx` | Full navigation map — OSRM road routing, animated heading-aware truck icon, live GPS tracking, speed/distance/ETA stats bar, follow-mode toggle, fullscreen mode, "Open in Google Maps" deep-link |
| `SyncIndicator.jsx` | Online/offline widget — shows pending crop count, triggers sync on reconnect, displays sync feedback |

### Services (`frontend/src/services/`)

| File | Description |
|------|-------------|
| `api.js` | Fetch-based API client — JSON serialisation, error handling; exports all API calls (auth, crops, orders, deliveries) |
| `offlineDB.js` | IndexedDB manager — `openDB` (schema migration), `savePendingCrop`, `getPendingCrops`, `clearPendingCrops` |
| `syncService.js` | Sync orchestrator — detects online status, reads IndexedDB pending crops, calls `/crops/sync`, clears cache on success |

### Hooks (`frontend/src/hooks/`)

| File | Description |
|------|-------------|
| `useAuth.js` | Auth state hook — user object from `localStorage`, `loginUser`, `logout` callbacks |
| `useOnlineStatus.js` | Online/offline hook — listens to `window` `online`/`offline` events, returns boolean |

### Context (`frontend/src/context/`)

| File | Description |
|------|-------------|
| `LanguageContext.jsx` | Multi-language provider — 9 languages (English, Hindi, Marathi, Kannada, Telugu, Tamil, Gujarati, Punjabi, Bengali), `t()` translation function, `localStorage` persistence |

### Public Assets (`frontend/public/`)

| File | Description |
|------|-------------|
| `icon-192.png` | PWA icon 192 × 192 px |
| `icon-512.png` | PWA icon 512 × 512 px |

### Build Output (`frontend/dist/`) — generated, do not edit

| File | Description |
|------|-------------|
| `index.html` | Production HTML with hashed asset links |
| `sw.js` | Service Worker for PWA offline support |
| `registerSW.js` | Service Worker registration script |
| `workbox-*.js` | Workbox runtime for advanced caching strategies |
| `manifest.webmanifest` | Web App Manifest (name, icons, theme colours) |
| `assets/index-*.js` | Bundled React application JavaScript |
| `assets/index-*.css` | Bundled Tailwind + custom CSS |

---

## Feature Summary

| Feature | Files involved |
|---------|---------------|
| OTP Authentication | `authController.js`, `auth.js`, `Login.jsx`, `Register.jsx`, `useAuth.js` |
| Crop Management | `Crop.js`, `cropController.js`, `crops.js`, `AddCrop.jsx`, `FarmerDashboard.jsx`, `CropCard.jsx` |
| Marketplace | `Marketplace.jsx`, `OrderPage.jsx`, `api.js` |
| Order Lifecycle | `Order.js`, `orderController.js`, `orders.js`, `FarmerOrders.jsx`, `RetailerOrders.jsx`, `OrderCard.jsx` |
| Delivery & Navigation | `Delivery.js`, `deliveryController.js`, `deliveries.js`, `TransporterDashboard.jsx`, `DeliveryMap.jsx` |
| Payments | `PaymentPage.jsx`, `orderController.js` (`/pay` endpoint) |
| Offline Sync | `offlineDB.js`, `syncService.js`, `AddCrop.jsx`, `SyncIndicator.jsx` |
| Live Navigation Map | `DeliveryMap.jsx` (OSRM routing, GPS, speed/ETA, fullscreen, Google Maps link) |
| Multi-language UI | `LanguageContext.jsx`, `Navbar.jsx`, all pages via `t()` |
| PWA | `vite.config.js`, `sw.js`, `manifest.webmanifest`, `icon-*.png` |

---

## Full Project Explanation

### What is Mandi-Connect?

Mandi-Connect is a **digital agricultural marketplace** built for rural India. It directly connects three types of users — **Farmers**, **Retailers**, and **Transporters** — removing middlemen and enabling transparent, fair trade. The app is designed to work even on low-bandwidth or intermittent internet connections (offline-first), and supports **9 regional languages** to be accessible to users across India.

---

### How It Works — End to End

#### 1. Authentication (OTP-based, no passwords)
- A user opens the app and enters their **phone number**.
- The backend generates a **6-digit OTP** (stored in memory for 5 minutes) and displays it as a hint (in a real deployment, it would be sent via SMS).
- The user selects their **role** (Farmer / Retailer / Transporter) and enters the OTP.
- On first login, they are redirected to **Register** to fill in their name, location, and (for transporters) vehicle type.
- On subsequent logins, they land directly on their role-specific dashboard.
- The logged-in user object is saved to `localStorage` so the session persists across page refreshes.

#### 2. Farmer Flow
- After login, the farmer lands on **FarmerDashboard** which shows:
  - Total crops listed, total value, and any crops pending sync (saved offline).
  - A demand heatmap showing which crops are most ordered.
- The farmer taps **Add Crop** to go to `AddCrop.jsx`:
  - Selects a crop name (preset list or custom), enters quantity, unit, price per unit, and availability date.
  - Can pick their location on an interactive map or use GPS.
  - Optionally uploads a photo.
  - If the device is **offline**, the crop is saved to **IndexedDB** locally and marked as "pending sync". When the device comes back online, `SyncIndicator` automatically uploads all pending crops to the server.
- The farmer can view **FarmerOrders** to see all incoming orders from retailers — showing the buyer, quantity ordered, total price, payment status, and delivery status.

#### 3. Retailer Flow
- After login, the retailer lands on **Marketplace** which shows all available crops from all farmers.
  - They can filter by crop name, price range, or location.
  - Each crop is shown as a `CropCard` with details and an **Order** button.
- Tapping Order opens **OrderPage**:
  - The retailer picks the quantity they want to buy.
  - They specify a **drop location** by clicking on a map (`MapPicker`).
  - Total price is calculated live (quantity × price per unit).
  - On confirmation, an order is created on the backend which also **automatically creates a Delivery record**.
- The retailer can then go to **RetailerOrders** to track all their purchases through the full pipeline: pending → accepted → paid → shipped → delivered.
- When the order is accepted, the retailer proceeds to **PaymentPage**:
  - Shows order summary with a full payout breakdown: how much goes to the farmer, transporter fee, and platform commission.
  - The retailer selects a payment method and confirms. The backend marks the order as paid.

#### 4. Transporter Flow
- After login the transporter sees **TransporterDashboard** with three stat cards: available jobs, active jobs, and completed deliveries.
- **Available tab**: lists all pending deliveries (auto-created when orders are placed). Each card shows:
  - Pickup location (farmer's location) and drop-off location (retailer's drop point).
  - A static map showing the route.
  - An **Accept Job** button.
- **My Jobs tab**: lists accepted deliveries. Each card shows:
  - Full route on a live navigation map (`DeliveryMap`).
  - **Speed**, **remaining distance**, and **ETA** pulled from live GPS.
  - A **Start Transit** button (moves status to `in-transit`) and then a **Mark Delivered** button.
  - A **Follow mode** toggle to keep the map centred on the truck's moving location.
  - A **Fullscreen** button for proper navigation view while driving.
  - An **Open in Google Maps** button that launches turn-by-turn navigation in Google Maps with the correct waypoints.

#### 5. Delivery Map — Technical Detail
`DeliveryMap.jsx` is the core navigation component:
- Uses **Leaflet** (open-source maps, no API key needed) with **OpenStreetMap** tiles.
- Fetches the real road route between pickup and dropoff from the **OSRM** (Open Source Routing Machine) public API — so the route follows actual roads, not straight lines.
- Uses `navigator.geolocation.watchPosition` to continuously track the transporter's GPS position at high accuracy.
- Calculates the transporter's **heading (bearing)** between consecutive GPS positions and rotates the truck icon accordingly.
- If the OSRM API is unavailable (offline), it falls back to a dashed straight-line polyline between the points.
- The truck marker pulses with an animated SVG ring to make the live position visually clear.

#### 6. Offline-First Architecture
- When a farmer adds a crop without connectivity, `offlineDB.js` saves it to **IndexedDB** (a built-in browser database that survives tab closes).
- `SyncIndicator` watches the online status using the `useOnlineStatus` hook and automatically calls `syncService.js` when connectivity returns.
- `syncService.js` reads all pending crops from IndexedDB, sends them to `POST /crops/sync` on the backend in one batch, and then clears the local cache.
- This means **farmers never lose data** even if they fill in crop details from a remote field with no internet.

#### 7. Multi-language Support
- `LanguageContext.jsx` wraps the entire app and provides a `t(key)` function.
- It holds translation strings for **9 languages**: English, Hindi, Marathi, Kannada, Telugu, Tamil, Gujarati, Punjabi, and Bengali.
- Every piece of user-visible text in every page and component calls `t('keyName')` instead of hardcoding English strings.
- The user's selected language is saved to `localStorage` so it persists across sessions.
- The language switcher is in the `Navbar` and is accessible from every screen.

#### 8. PWA (Progressive Web App)
- The app is configured as a PWA via `vite.config.js` using the `VitePWA` plugin.
- On first load, a **Service Worker** (`sw.js`) is registered that caches the app shell, static assets, and recent API responses.
- Users can **install** the app to their home screen on Android/iOS and open it like a native app.
- The Service Worker uses **Workbox** strategies: the app shell is served from cache first, and API calls use a network-first strategy with a cache fallback, ensuring the app loads even with no internet.

#### 9. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 with Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS with custom design tokens |
| Icons | Lucide React |
| Maps | Leaflet + react-leaflet + OSRM routing |
| Offline storage | IndexedDB (via custom `offlineDB.js`) |
| PWA | VitePWA + Workbox |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas via Mongoose |
| Auth | Phone + OTP (in-memory store, no JWT — stateless sessions in localStorage) |
| Languages | 9 Indian regional languages via Context API |

#### 10. Data Flow Diagram (Text)

```
Farmer                   Backend (Express + MongoDB)          Retailer
  │                              │                               │
  ├─ Register / Login ──────────►│◄─────────────── Login ────────┤
  │                              │                               │
  ├─ Add Crop ──────────────────►│  Crop saved to DB             │
  │  (offline → IndexedDB)       │                               │
  │  (online → /crops/add)       │◄─── GET /marketplace ─────────┤
  │                              │     (filtered crop list)      │
  │                              │                               │
  │  Incoming order notified     │◄─── POST /orders/create ──────┤
  ├◄─ GET /orders/farmer ────────┤     (auto-creates Delivery)   │
  │                              │                               │
  │                              │         Transporter           │
  │                              │◄─── GET /deliveries/pending ──┤
  │                              │                               │
  │                              │◄─── PUT /deliveries/:id/accept┤
  │                              │                               │
  │  Payment confirmed           │◄─── POST /orders/:id/pay ─────┤
  │                              │                               │
  │                              │◄─── PUT delivery in-transit ──┤
  │                              │◄─── PUT delivery delivered ───┤
```

This is the complete lifecycle of a transaction on Mandi-Connect — from a farmer listing a crop in a remote field (possibly offline) to a retailer receiving the delivery tracked in real time on a live navigation map.
