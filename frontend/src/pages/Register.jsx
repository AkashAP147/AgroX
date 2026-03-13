import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerFarmer, registerRetailer, registerTransporter } from '../services/api';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../services/firebase';
import { UserPlus, Tractor, Store, Truck, Loader2, ShieldCheck, ArrowLeft, KeyRound, LocateFixed, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ROLE_IDS = [
  { id: 'farmer', Icon: Tractor, key: 'farmer' },
  { id: 'retailer', Icon: Store, key: 'retailer' },
  { id: 'transporter', Icon: Truck, key: 'transporter' }
];

const VEHICLES = [
  { value: 'truck', label: 'Truck', Icon: Truck },
  { value: 'mini-truck', label: 'Mini Truck', Icon: Truck },
  { value: 'tempo', label: 'Tempo', Icon: Truck },
  { value: 'auto', label: 'Auto', Icon: Truck }
];

export default function Register({ onLogin }) {
  const { t } = useLanguage();
  const [role, setRole] = useState('farmer');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [vehicleType, setVehicleType] = useState('truck');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationHint, setLocationHint] = useState('');
  const [step, setStep] = useState('details'); // details | otp
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const navigate = useNavigate();

  const registerFns = { farmer: registerFarmer, retailer: registerRetailer, transporter: registerTransporter };

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  useEffect(() => {
    if (step !== 'details' || location) return;
    detectLiveLocation();
  }, [step]);

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const name = addr.village || addr.town || addr.city || addr.suburb || addr.county ||
        data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      return name.trim();
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  function detectLiveLocation() {
    if (!navigator.geolocation) {
      setLocationHint(t('couldntDetect'));
      return;
    }

    setLocating(true);
    setLocationHint(t('detectingLocation'));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const name = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setLocation(name);
        setLocationHint(name);
        setLocating(false);
      },
      () => {
        setLocationHint(t('couldntDetect'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  async function handleSendOTP(e) {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Always recreate verifier so stale/broken instances don't block retries
      if (window.recaptchaVerifierRegister) {
        window.recaptchaVerifierRegister.clear();
        window.recaptchaVerifierRegister = null;
      }
      window.recaptchaVerifierRegister = new RecaptchaVerifier(auth, 'recaptcha-container-register', {
        size: 'invisible'
      });
      const result = await signInWithPhoneNumber(auth, `+91${phone}`, window.recaptchaVerifierRegister);
      setConfirmationResult(result);
      setStep('otp');
      setResendTimer(30);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err) {
      // Clear broken verifier so next attempt starts fresh
      if (window.recaptchaVerifierRegister) {
        window.recaptchaVerifierRegister.clear();
        window.recaptchaVerifierRegister = null;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(index, value) {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs[index + 1].current?.focus();
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  }

  function handleOtpPaste(e) {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(''));
      otpRefs[5].current?.focus();
    }
  }

  async function handleVerifyAndRegister(e) {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (!confirmationResult) throw new Error('Please request OTP first');
      await confirmationResult.confirm(otpString);
      const body = { name, phone, location };
      if (role === 'transporter') body.vehicleType = vehicleType;
      const data = await registerFns[role](body);
      onLogin(data.user);
      if (role === 'farmer') navigate('/farmer');
      else if (role === 'retailer') navigate('/marketplace');
      else navigate('/transporter');
    } catch (err) {
      setError(err.message);
      setOtp(['', '', '', '', '', '']);
      otpRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      {/* reCAPTCHA must always be in DOM - never inside conditional renders */}
      <div id="recaptcha-container-register" style={{ display: 'none' }} />
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4">
            {step === 'details'
              ? <UserPlus className="w-8 h-8 text-primary-700" />
              : <ShieldCheck className="w-8 h-8 text-primary-700" />
            }
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {step === 'details' ? t('createAccount') : t('verifyOTP')}
          </h1>
          <p className="text-gray-500 mt-2">
            {step === 'details'
              ? t('joinMandiConnect')
              : <>{t('otpSentTo')} <span className="font-semibold text-gray-700">+91 {phone}</span></>
            }
          </p>
        </div>

        {step === 'details' ? (
          /* ---- STEP 1: Registration Details ---- */
          <form onSubmit={handleSendOTP} className="card-static p-6 sm:p-8 space-y-5">
            {/* Role */}
            <div>
              <label className="label">{t('iAmA')}</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_IDS.map(r => (
                  <button type="button" key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`chip flex flex-col items-center gap-1.5 py-3
                      ${role === r.id ? 'chip-active' : 'chip-inactive'}`}>
                    <r.Icon className="w-5 h-5" />
                    <span className="text-xs">{t(r.key)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="label">{t('fullName')}</label>
              <input className="input" placeholder={t('enterYourName')}
                value={name} onChange={e => setName(e.target.value)} required />
            </div>

            {/* Phone */}
            <div>
              <label className="label">{t('phoneNumber')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">+91</span>
                <input type="tel" className="input pl-12" placeholder="10-digit number"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  pattern="[0-9]{10}" maxLength={10} required />
              </div>
            </div>

            <div>
              <label className="label">{t('location')}</label>
              <input className="input" placeholder={t('villageCityPlaceholder')}
                value={location} onChange={e => setLocation(e.target.value)} required />
              <div className="mt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={detectLiveLocation}
                  disabled={locating}
                  className="btn btn-secondary"
                >
                  {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                  {t('detectViaGPS')}
                </button>
                <p className="text-xs text-gray-400 text-right flex items-center gap-1 max-w-[60%]">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{locationHint || 'Live location will be used when available'}</span>
                </p>
              </div>
            </div>

            {/* Vehicle Type */}
            {role === 'transporter' && (
              <div className="animate-scale-in">
                <label className="label">{t('vehicleType')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {VEHICLES.map(v => (
                    <button type="button" key={v.value}
                      onClick={() => setVehicleType(v.value)}
                      className={`chip text-sm py-2.5 flex items-center justify-center gap-2
                        ${vehicleType === v.value ? 'chip-active' : 'chip-inactive'}`}>
                      <v.Icon className="w-4 h-4" /> {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-scale-in">
                <span className="flex-shrink-0">⚠</span> {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="btn btn-primary w-full text-lg py-4" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> {t('sendingOTP')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5" /> {t('verifyPhoneRegister')}
                </span>
              )}
            </button>

            <p className="text-center text-sm text-gray-500">
              {t('alreadyRegistered')}{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                {t('signIn')}
              </Link>
            </p>
          </form>
        ) : (
          /* ---- STEP 2: OTP Verification ---- */
          <form onSubmit={handleVerifyAndRegister} className="card-static p-6 sm:p-8 space-y-5">
            {/* OTP Input */}
            <div>
              <label className="label text-center">Enter 6-digit OTP</label>
              <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all duration-200 bg-white"
                  />
                ))}
              </div>
            </div>

            {/* Resend */}
            <div className="text-center text-sm">
              {resendTimer > 0 ? (
                <span className="text-gray-400">{t('resendOTPIn')} <span className="font-semibold text-gray-600">{resendTimer}s</span></span>
              ) : (
                <button type="button" onClick={handleSendOTP}
                  className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                  {t('resendOTP')}
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-scale-in">
                <span className="flex-shrink-0">⚠</span> {error}
              </div>
            )}

            {/* Actions */}
            <button type="submit" className="btn btn-primary w-full text-lg py-4" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> {t('verifying')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" /> {t('verifyCreateAccount')}
                </span>
              )}
            </button>

            <button type="button"
              onClick={() => { setStep('details'); setOtp(['', '', '', '', '', '']); setError(''); }}
              className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-2">
              <ArrowLeft className="w-4 h-4" /> {t('backToDetails')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
