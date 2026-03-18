import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import Navbar from './components/Navbar';
import SyncIndicator from './components/SyncIndicator';
import { LanguageProvider } from './context/LanguageContext';
import ProfilePage from './pages/Profile';
import EditCrop from './pages/EditCrop';
import { useState, useEffect } from 'react';
import { getFarmerCrops } from './services/api';

// Wrapper to provide crops and reload logic to EditCrop
function EditCropWrapper({ user }) {
  const [crops, setCrops] = useState([]);
  useEffect(() => {
    getFarmerCrops(user._id).then(setCrops);
  }, [user._id]);
  return <EditCrop crops={crops} onCropUpdated={() => getFarmerCrops(user._id).then(setCrops)} />;
}

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import FarmerDashboard from './pages/FarmerDashboard';
import AddCrop from './pages/AddCrop';
import FarmerOrders from './pages/FarmerOrders';
import Marketplace from './pages/Marketplace';
import OrderPage from './pages/OrderPage';
import RetailerOrders from './pages/RetailerOrders';
import PaymentPage from './pages/PaymentPage';
import TransporterDashboard from './pages/TransporterDashboard';

function getHomeRoute(user) {
  if (!user) return '/';
  if (user.role === 'farmer') return '/farmer';
  if (user.role === 'retailer') return '/marketplace';
  return '/transporter';
}

function ProtectedRoute({ user, role, children }) {
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

export default function App() {
  const { user, loginUser, logout, updateUser } = useAuth();
  const homeRoute = getHomeRoute(user);

  return (
    <LanguageProvider>
    <BrowserRouter>
      <Navbar user={user} onLogout={logout} onUpdateUser={updateUser} />
      <main className="pb-20">
        <Routes>
          <Route path="/" element={user ? (
            <Navigate to={homeRoute} />
          ) : <Landing />} />

          <Route path="/login" element={user ? <Navigate to={homeRoute} /> : <Login onLogin={loginUser} />} />
          <Route path="/register" element={user ? <Navigate to={homeRoute} /> : <Register onLogin={loginUser} />} />

          {/* Farmer routes */}
          <Route path="/farmer" element={
            <ProtectedRoute user={user} role="farmer">
              <FarmerDashboard user={user} onUpdateUser={updateUser} />
            </ProtectedRoute>
          } />
          <Route path="/farmer/add-crop" element={
            <ProtectedRoute user={user} role="farmer">
              <AddCrop user={user} />
            </ProtectedRoute>
          } />
          <Route path="/farmer/edit-crop/:cropId" element={
            <ProtectedRoute user={user} role="farmer">
              <EditCropWrapper user={user} />
            </ProtectedRoute>
          } />
          <Route path="/farmer/orders" element={
            <ProtectedRoute user={user} role="farmer">
              <FarmerOrders user={user} />
            </ProtectedRoute>
          } />

          {/* Retailer routes */}
          <Route path="/marketplace" element={<Marketplace user={user} onUpdateUser={updateUser} />} />
          <Route path="/order/:cropId" element={
            <ProtectedRoute user={user} role="retailer">
              <OrderPage user={user} />
            </ProtectedRoute>
          } />

          <Route path="/retailer/orders" element={
            <ProtectedRoute user={user} role="retailer">
              <RetailerOrders user={user} />
            </ProtectedRoute>
          } />



          {/* Payment */}
          <Route path="/payment/:orderId" element={
            <ProtectedRoute user={user}>
              <PaymentPage />
            </ProtectedRoute>
          } />

          {/* Transporter */}
          <Route path="/transporter" element={
            <ProtectedRoute user={user} role="transporter">
              <TransporterDashboard user={user} />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute user={user}>
              <ProfilePage user={user} onUpdateUser={updateUser} />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <SyncIndicator />
    </BrowserRouter>
    </LanguageProvider>
  );
}
