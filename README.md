# 🌾 Mandi-Connect — Direct Farm-to-Retail Logistics Marketplace

A low-bandwidth, offline-first web platform connecting small farmers directly with retailers and transporters — eliminating middlemen.

---

## 📁 Project Structure

```
mandi-connect/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js   # Register/login for all roles
│   │   ├── cropController.js   # Add/list/sync crops
│   │   ├── orderController.js  # Create/manage orders + payment
│   │   └── deliveryController.js # Delivery management
│   ├── models/
│   │   ├── Farmer.js
│   │   ├── Retailer.js
│   │   ├── Transporter.js
│   │   ├── Crop.js
│   │   ├── Order.js
│   │   └── Delivery.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── crops.js
│   │   ├── orders.js
│   │   └── deliveries.js
│   ├── server.js
│   ├── .env
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── CropCard.jsx
│   │   │   ├── OrderCard.jsx
│   │   │   └── SyncIndicator.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useOnlineStatus.js
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── FarmerDashboard.jsx
│   │   │   ├── AddCrop.jsx
│   │   │   ├── FarmerOrders.jsx
│   │   │   ├── Marketplace.jsx
│   │   │   ├── OrderPage.jsx
│   │   │   ├── RetailerOrders.jsx
│   │   │   ├── PaymentPage.jsx
│   │   │   └── TransporterDashboard.jsx
│   │   ├── services/
│   │   │   ├── api.js          # REST API calls
│   │   │   ├── offlineDB.js    # IndexedDB for offline storage
│   │   │   └── syncService.js  # Offline → server sync
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
└── README.md
```

---

## 🚀 How to Run Locally

### Prerequisites

- **Node.js** v18+ installed
- **MongoDB** running locally (default: `mongodb://127.0.0.1:27017`)

### 1. Backend

```bash
cd mandi-connect/backend
npm install
npm run dev
```

The API server starts on **http://localhost:5000**.

### 2. Frontend

```bash
cd mandi-connect/frontend
npm install
npm run dev
```

The frontend starts on **http://localhost:5173** with an API proxy to the backend.

---

## 📡 API Endpoints

| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| POST   | `/api/auth/register/farmer`       | Register a farmer              |
| POST   | `/api/auth/register/retailer`     | Register a retailer            |
| POST   | `/api/auth/register/transporter`  | Register a transporter         |
| POST   | `/api/auth/login`                 | Login (phone + role)           |
| POST   | `/api/crops/add`                  | Add a crop listing             |
| GET    | `/api/crops/farmer/:farmerId`     | Get farmer's crops             |
| GET    | `/api/crops/marketplace`          | Browse all crops (with filters)|
| POST   | `/api/crops/sync`                 | Sync offline crops to server   |
| POST   | `/api/orders/create`              | Place an order                 |
| GET    | `/api/orders/farmer/:farmerId`    | Farmer's received orders       |
| GET    | `/api/orders/retailer/:retailerId`| Retailer's placed orders       |
| PUT    | `/api/orders/:orderId/status`     | Accept/reject order            |
| POST   | `/api/orders/:orderId/pay`        | Mock UPI payment               |
| GET    | `/api/deliveries/pending`         | Available delivery jobs        |
| GET    | `/api/deliveries/transporter/:id` | Transporter's jobs             |
| PUT    | `/api/deliveries/:id/accept`      | Accept a delivery job          |
| PUT    | `/api/deliveries/:id/status`      | Update delivery status         |

---

## 🧪 Database Models

### Farmer
`{ name, phone, location, role }`

### Retailer
`{ name, phone, location, role }`

### Transporter
`{ name, phone, location, vehicleType, role }`

### Crop
`{ cropName, quantity, price, farmerId, farmerName, location, coordinates, availableUntil, status }`

### Order
`{ cropId, farmerId, retailerId, retailerName, cropName, quantity, totalPrice, status, paymentStatus, pickupLocation, dropLocation }`

### Delivery
`{ orderId, transporterId, transporterName, pickupLocation, dropLocation, pickupCoordinates, dropCoordinates, deliveryStatus }`

---

## 🔑 Key Features

| Feature                  | Implementation                          |
|--------------------------|-----------------------------------------|
| Offline crop listing     | IndexedDB → sync when online            |
| PWA / installable        | Service Worker via vite-plugin-pwa      |
| Mock UPI payments        | Simulated Google Pay / PhonePe flow     |
| Low bandwidth            | No images, lightweight JSON API         |
| Mobile friendly          | Large buttons, simple forms, Tailwind   |
| Online/offline indicator | Real-time connectivity badge in navbar  |
| Demand heatmap           | Placeholder grid on farmer dashboard    |
| Price prediction          | Placeholder data on farmer dashboard    |

---

## 👥 User Roles

- **Farmer** — Register → Add crops → View/accept orders → Track payments
- **Retailer** — Register → Browse marketplace → Place orders → Pay via UPI
- **Transporter** — Register → View delivery requests → Accept & complete jobs

---

## 🛠️ Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS, PWA       |
| Backend   | Node.js, Express.js                     |
| Database  | MongoDB + Mongoose                      |
| Offline   | IndexedDB + Service Workers             |
| Payments  | Mock UPI (simulated)                    |
| Maps      | Mock coordinates (lat/lng placeholders) |
