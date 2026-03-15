import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { useLanguage } from '../context/LanguageContext';
import { updateFarmerProfile } from '../services/api';
import jsQR from 'jsqr';
import { Wheat, LayoutDashboard, Sprout, ClipboardList, ShoppingCart, Truck, Menu, X, LogOut, Wifi, WifiOff, Settings, User, MapPin, Phone, Shield, Globe, ChevronDown, QrCode, CreditCard, Check, Loader2, Moon, Sun } from 'lucide-react';

export default function Navbar({ user, onLogout, onUpdateUser }) {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const location = useLocation();
  const { lang, setLang, t, languages } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shouldAnimateIn, setShouldAnimateIn] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [upiPanel, setUpiPanel] = useState(false);
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [upiQr, setUpiQr] = useState(user?.upiQr || '');
  const [upiSaving, setUpiSaving] = useState(false);
  const [upiSaved, setUpiSaved] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const settingsRef = useRef(null);
  const langRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  // Sync UPI state when user changes
  useEffect(() => {
    setUpiId(user?.upiId || '');
    setUpiQr(user?.upiQr || '');
  }, [user?.upiId, user?.upiQr]);

  async function handleUpiSave() {
    if (!user?._id) return;
    setUpiSaving(true);
    try {
      const res = await updateFarmerProfile(user._id, { upiId, upiQr });
      onUpdateUser?.({ upiId: res.user.upiId, upiQr: res.user.upiQr });
      setUpiSaved(true);
      setTimeout(() => setUpiSaved(false), 2500);
    } catch { /* ignore */ }
    setUpiSaving(false);
  }

  function handleQrUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setUpiQr(dataUrl);
      // Decode QR to extract UPI ID
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          // UPI QR format: upi://pay?pa=ID&... or just the raw UPI ID
          const match = code.data.match(/[?&]pa=([^&]+)/i) || code.data.match(/^([\w.\-]+@[\w\-]+)$/);
          if (match) setUpiId(decodeURIComponent(match[1]));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // Close settings dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = languages.find(l => l.code === lang);

  const links = {
    farmer: [
      { to: '/farmer', label: t('dashboard'), icon: LayoutDashboard },
      { to: '/farmer/add-crop', label: t('addCrop'), icon: Sprout },
      { to: '/farmer/orders', label: t('orders'), icon: ClipboardList }
    ],
    retailer: [
      { to: '/marketplace', label: t('marketplace'), icon: ShoppingCart },
      { to: '/retailer/orders', label: t('myOrders'), icon: ClipboardList }
    ],
    transporter: [
      { to: '/transporter', label: t('dashboard'), icon: LayoutDashboard }
    ]
  };

  const isActive = (path) => location.pathname === path;

  // Handle sliding animation for mobile menu (open and close)
  useEffect(() => {
    if (menuOpen) {
      setMounted(true);
      setShouldAnimateIn(true);
    } else if (mounted) {
      // Wait for animation to finish before unmounting
      const timeout = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [menuOpen]);

  // Ensure opening animation is smooth (panel starts offscreen, then animates in)
  useEffect(() => {
    if (mounted && shouldAnimateIn) {
      // Wait a frame before setting menuOpen true so transition applies
      requestAnimationFrame(() => setShouldAnimateIn(false));
    }
  }, [mounted, shouldAnimateIn]);

  // Hide all content below navbar when mobile menu is open
  // Render mobile menu in a portal to ensure it overlays everything
  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
              <Wheat className="w-5 h-5 text-primary-700" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-gray-900">
              Agro<span className="text-primary-600">X</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {user && links[user.role]?.map(l => {
              const Icon = l.icon;
              return (
                <Link key={l.to} to={l.to}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5
                        ${isActive(l.to)
                          ? 'bg-primary-50 text-primary-700 shadow-sm'
                          : 'text-gray-600 hover:text-primary-700 hover:bg-gray-50'
                        }`}>
                  <Icon className="w-4 h-4" /> {l.label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Online indicator */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
              ${online
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-red-50 text-red-600 ring-1 ring-red-200'
              }`}>
              {online
                ? <Wifi className="w-3 h-3 animate-pulse-soft" />
                : <WifiOff className="w-3 h-3" />
              }
              {online ? t('online') : t('offline')}
            </div>

            {/* Language Toggle */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
                  ${langOpen ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{currentLang?.native}</span>
                <span className="sm:hidden">{lang.toUpperCase()}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>

              {langOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-scale-in origin-top-right z-50 max-h-72 overflow-y-auto">
                  <div className="p-1.5">
                    {languages.map(l => (
                      <button
                        key={l.code}
                        onClick={() => { setLang(l.code); setLangOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors
                          ${lang === l.code
                            ? 'bg-primary-50 text-primary-700 font-semibold'
                            : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        <span>{l.native}</span>
                        <span className="text-[10px] text-gray-400 font-normal">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user && (
              <div className="relative hidden md:block" ref={settingsRef}>
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={`p-2 rounded-lg transition-all duration-200 ${settingsOpen ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                >
                  <Settings className={`w-5 h-5 transition-transform duration-300 ${settingsOpen ? 'rotate-90' : ''}`} />
                </button>

                {/* Settings Dropdown */}
                {settingsOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-scale-in origin-top-right z-50">
                    {/* User Info */}
                    <div className="p-4 bg-gradient-to-br from-primary-50 to-emerald-50 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.photoURL || '/default-avatar.png'}
                          alt="Profile"
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-primary-100"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Shield className="w-3 h-3" />
                            {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                          </p>
                        </div>
                      </div>
                      {user.phone && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                          <Phone className="w-3 h-3" /> {user.phone}
                        </div>
                      )}
                      {user.location && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" /> {user.location}
                        </div>
                      )}
                    </div>

                    {/* UPI Settings — farmers only */}
                    {user.role === 'farmer' && (
                      <div className="border-t border-gray-100">
                        <button
                          onClick={() => setUpiPanel(p => !p)}
                          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-blue-500" />
                            UPI Payment Settings
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${upiPanel ? 'rotate-180' : ''}`} />
                        </button>

                        {upiPanel && (
                          <div className="px-4 pb-4 space-y-3 animate-fade-in">
                            {/* UPI ID */}
                            <div>
                              <label className="text-xs font-semibold text-gray-500 mb-1 block">UPI ID</label>
                              <input
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
                                placeholder="yourname@upi"
                                value={upiId}
                                onChange={e => setUpiId(e.target.value)}
                              />
                            </div>

                            {/* QR Upload */}
                            <div>
                              <label className="text-xs font-semibold text-gray-500 mb-1 block">UPI QR Code</label>
                              {upiQr ? (
                                <div className="relative">
                                  <img src={upiQr} alt="UPI QR" className="w-full max-h-40 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                                  <button
                                    onClick={() => setUpiQr('')}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]"
                                  >✕</button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center gap-1 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 hover:bg-primary-50/50 transition-colors">
                                  <QrCode className="w-6 h-6 text-gray-400" />
                                  <span className="text-xs text-gray-400">Upload QR image</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                                </label>
                              )}
                            </div>

                            {/* Save */}
                            <button
                              onClick={handleUpiSave}
                              disabled={upiSaving}
                              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${upiSaved ? 'bg-emerald-500 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                            >
                              {upiSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : upiSaved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save UPI Details'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Profile Edit Option */}
                    <Link
                      to="/profile"
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                      onClick={() => setSettingsOpen(false)}
                    >
                      <User className="w-4 h-4 text-primary-600" />
                      Edit Profile
                    </Link>

                    {/* Logout */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          onLogout();
                          setSettingsOpen(false);
                          navigate('/login');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> {t('logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Hamburger */}
            {user && (
              <button onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {(user && mounted) && createPortal(
          <>
            {/* Overlay for click-outside-to-close */}
            <div
              className="fixed inset-0 z-[99998] bg-black/30 md:hidden"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu overlay"
              style={{ pointerEvents: menuOpen ? 'auto' : 'none', opacity: menuOpen ? 1 : 0, transition: 'opacity 300ms' }}
            />
            {/* Slidable menu panel with animation */}
            <div
              className={`fixed inset-y-0 right-0 w-80 max-w-full z-[99999] bg-white md:hidden pb-4 pt-2 border-l border-gray-100 shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${(!menuOpen && !shouldAnimateIn) ? 'translate-x-full' : 'translate-x-0'}`}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex flex-col gap-1 h-full overflow-y-auto">
                {/* Close button at top right */}
                <button
                  className="absolute top-3 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
                {/* Profile card at top with Edit Profile inside (now first) */}
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <div className="px-4 py-3 flex items-center gap-3 bg-gradient-to-r from-primary-50/50 to-emerald-50/50 rounded-xl mx-2 mb-2 flex-col items-stretch">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.photoURL || '/default-avatar.png'}
                        alt="Profile"
                        className="w-9 h-9 rounded-full object-cover border border-gray-200 bg-primary-100 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                        </p>
                        {user.phone && (
                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {user.phone}
                          </p>
                        )}
                        {user.location && (
                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {user.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="w-full mt-3 text-center px-4 py-2.5 rounded-xl text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <User className="w-4 h-4 text-primary-600" /> Edit Profile
                    </Link>
                  </div>
                {/* Only show Orders in mobile menu for farmers (now after profile) */}
                {user.role === 'farmer' ? (
                  <Link to="/farmer/orders"
                    onClick={() => setMenuOpen(false)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2
                      ${isActive('/farmer/orders')
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                      }`}>
                    <ClipboardList className="w-4 h-4" />{t('orders')}
                  </Link>
                ) : (
                  links[user.role]?.map(l => {
                    const Icon = l.icon;
                    return (
                      <Link key={l.to} to={l.to}
                        onClick={() => setMenuOpen(false)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2
                          ${isActive(l.to)
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-600 hover:bg-gray-50'
                          }`}>
                        <Icon className="w-4 h-4" />{l.label}
                      </Link>
                    );
                  })
                )}
                  {/* Mobile UPI Settings – farmers only (now after logout) */}
                  {user.role === 'farmer' && (
                    <div className="px-2 pt-2 border-t border-gray-100 mt-2">
                      <button
                        onClick={() => setUpiPanel(p => !p)}
                        className="w-full flex items-center justify-between px-2 py-1.5 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-primary-600 transition-colors"
                      >
                        <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> UPI Payment Settings</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${upiPanel ? 'rotate-180' : ''}`} />
                      </button>
                      {upiPanel && (
                        <div className="space-y-2 pb-2 animate-fade-in">
                          <input
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
                            placeholder="UPI ID e.g. name@upi"
                            value={upiId}
                            onChange={e => setUpiId(e.target.value)}
                          />
                          {upiQr ? (
                            <div className="relative">
                              <img src={upiQr} alt="UPI QR" className="w-full max-h-32 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                              <button onClick={() => setUpiQr('')} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px]">✕</button>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 py-2 px-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 hover:bg-primary-50/50 transition-colors">
                              <QrCode className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-400">Upload QR image</span>
                              <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                            </label>
                          )}
                          <button
                            onClick={handleUpiSave}
                            disabled={upiSaving}
                            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${upiSaved ? 'bg-emerald-500 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                          >
                            {upiSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : upiSaved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save UPI Details'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={() => { onLogout(); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> {t('logout')}
                  </button>

                  {/* Mobile Language Selector removed as requested */}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
        </div>
      </nav>
      {/* No overlay needed, menu is now at highest z-index and covers all */}
    </>
  );
}
