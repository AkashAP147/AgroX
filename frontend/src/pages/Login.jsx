import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginAPI } from '../services/api';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../services/firebase';
import { Wheat, Tractor, Store, Truck, Loader2, ShieldCheck, ArrowLeft, KeyRound } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ROLE_IDS = [
  { id: 'farmer', Icon: Tractor, key: 'farmer' },
  { id: 'retailer', Icon: Store, key: 'retailer' },
  { id: 'transporter', Icon: Truck, key: 'transporter' }
];

export default function Login({ onLogin }) {
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('farmer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('phone'); // phone | otp
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const navigate = useNavigate();

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  async function handleSendOTP(e) {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Always recreate verifier so stale/broken instances don't block retries
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-login', {
        size: 'invisible'
      });
      const result = await signInWithPhoneNumber(auth, `+91${phone}`, window.recaptchaVerifier);
      setConfirmationResult(result);
      setStep('otp');
      setResendTimer(30);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err) {
      // Clear broken verifier so next attempt starts fresh
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
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
    // Auto-focus next input
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

  async function handleVerifyAndLogin(e) {
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
      const data = await loginAPI({ phone, role });
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
      <div id="recaptcha-container-login" style={{ display: 'none' }} />
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4">
            {step === 'phone'
              ? <Wheat className="w-8 h-8 text-primary-700" />
              : <ShieldCheck className="w-8 h-8 text-primary-700" />
            }
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {step === 'phone' ? t('welcomeBack') : t('verifyOTP')}
          </h1>
          <p className="text-gray-500 mt-2">
            {step === 'phone'
              ? t('signInSubtitle')
              : <>{t('otpSentTo')} <span className="font-semibold text-gray-700">+91 {phone}</span></>
            }
          </p>
        </div>

        {step === 'phone' ? (
          /* ---- STEP 1: Phone + Role ---- */
          <form onSubmit={handleSendOTP} className="card-static p-6 sm:p-8 space-y-5">
            {/* Role selector */}
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
                  <KeyRound className="w-5 h-5" /> {t('sendOTP')}
                </span>
              )}
            </button>

            <p className="text-center text-sm text-gray-500">
              {t('newHere')}{' '}
              <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                {t('createAnAccount')}
              </Link>
            </p>
          </form>
        ) : (
          /* ---- STEP 2: OTP Verification ---- */
          <form onSubmit={handleVerifyAndLogin} className="card-static p-6 sm:p-8 space-y-5">
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
                  <ShieldCheck className="w-5 h-5" /> {t('verifySignIn')}
                </span>
              )}
            </button>

            <button type="button"
              onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(''); }}
              className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-2">
              <ArrowLeft className="w-4 h-4" /> {t('changePhoneNumber')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
