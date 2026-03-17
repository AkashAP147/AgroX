# AgroX Project Presentation Content

## Key Features
- **Offline crop listing:** Farmers can add crops even when offline; data syncs automatically when online.
- **OTP Authentication:** Secure, passwordless login for all users (farmer, retailer, transporter).
- **Google Login:** Fast web login via Google account.
- **Marketplace:** Retailers browse and order crops directly from farmers.
- **Order Lifecycle:** Track order status from creation to delivery and payment.
- **Delivery & Navigation:** Transporters get live navigation maps, route, and ETA for deliveries.
- **Payments:** Mock UPI payments for retailers; payment status tracked in orders.
- **Multi-language UI:** Supports 9 Indian regional languages for accessibility.
- **PWA / Installable:** Works as a Progressive Web App; installable on mobile and desktop.
- **Mobile Friendly:** Responsive UI, large buttons, simple forms.
- **Demand Heatmap:** Farmers see popular crops and demand trends.
- **Price Prediction:** Farmers get price insights (placeholder).
- **Online/Offline Indicator:** Real-time connectivity badge in navbar.

## Tech Stack
| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS, PWA       |
| Backend   | Node.js, Express.js                     |
| Database  | MongoDB + Mongoose                      |
| Offline   | IndexedDB + Service Workers             |
| Payments  | Mock UPI (simulated)                    |
| Maps      | Leaflet, react-leaflet, OSRM routing    |
| Auth      | Firebase (Google, OTP)                  |
| Languages | Context API, 9 Indian languages         |

## Scalability
- **Modular architecture:** Separate backend and frontend, easy to extend features.
- **Cloud database:** Uses MongoDB Atlas for scalable storage.
- **Offline-first:** IndexedDB and service workers allow scaling to rural areas with poor connectivity.
- **PWA:** Installable, works on any device, reduces server load.
- **API-driven:** REST endpoints for all major actions; can add mobile apps or third-party integrations.
- **Multi-language:** Easily add more languages for wider reach.

## Interface
- **Farmer Dashboard:** Crop list, demand heatmap, sync indicator, add crop form.
- **Retailer Marketplace:** Browse crops, place orders, pay via UPI, rate farmers (planned).
- **Transporter Dashboard:** Delivery jobs, live navigation, job status.
- **Landing Page:** Hero section, features, role selection, CTA buttons.
- **Mobile-first design:** Large touch targets, simple navigation.
- **Live maps:** DeliveryMap component for transporters.

## Conclusion
AgroX connects farmers, retailers, and transporters in a seamless, low-bandwidth, offline-first marketplace. It eliminates middlemen, ensures fair pricing, and leverages modern web tech for accessibility and scalability. The platform is ready for rural India, supports multiple languages, and can scale to millions of users with its modular, cloud-based architecture.

---

*For more details, see README.md and PROJECT_FILES.md in the repo.*
