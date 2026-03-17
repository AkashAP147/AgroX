import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginAPI, googleLogin } from '../services/api';
import { auth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from '../services/firebase';
import { Wheat, Tractor, Store, Truck, Loader2, ShieldCheck, ArrowLeft, KeyRound } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ROLE_IDS = [
  { id: 'farmer', Icon: Tractor, key: 'farmer' },
  { id: 'retailer', Icon: Store, key: 'retailer' },
  { id: 'transporter', Icon: Truck, key: 'transporter' }
];


export default function Login({ onLogin }) {
  const [method, setMethod] = useState('email'); // 'email', 'google', or 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('farmer');
  const [step, setStep] = useState('phone'); // phone | otp
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const navigate = useNavigate();
  const { t } = useLanguage();

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!email || !password) throw new Error('Email and password are required');
      // Firebase email login
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // Call backend to get user and role
      const res = await loginAPI({ uid: user.uid, email: user.email });
      onLogin(res.user);
      if (res.role === 'farmer') navigate('/farmer');
      else if (res.role === 'retailer') navigate('/marketplace');
      else navigate('/transporter');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      // Call backend to get user and role
      const res = await googleLogin({ uid: user.uid, email: user.email });
      onLogin(res.user);
      if (res.role === 'farmer') navigate('/farmer');
      else if (res.role === 'retailer') navigate('/marketplace');
      else navigate('/transporter');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ...existing code for OTP, resend, and UI...

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
            <Wheat className="w-8 h-8 text-primary-700" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {t('welcomeBack')}
          </h1>
          <p className="text-gray-500 mt-2">
            {t('signInSubtitle')}
          </p>
        </div>

        {/* Google Login - at top */}
        <div className="my-6 flex flex-col items-center">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn btn-outline w-full text-lg py-3 flex items-center justify-center gap-2 mb-4"
            disabled={loading}
            style={{ maxWidth: 340 }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}><path d="M21.805 10.023h-9.765v3.977h5.588c-.241 1.285-1.03 2.377-2.199 3.093v2.572h3.548c2.078-1.916 3.298-4.74 2.828-7.642z" fill="#4285F4"/><path d="M12.04 21c2.47 0 4.541-.816 6.055-2.211l-3.548-2.572c-.984.661-2.24 1.054-3.507 1.054-2.695 0-4.98-1.818-5.797-4.267h-3.6v2.684c1.505 2.97 4.646 5.312 8.397 5.312z" fill="#34A853"/><path d="M6.243 13.004a5.996 5.996 0 0 1 0-3.008v-2.684h-3.6a9.003 9.003 0 0 0 0 8.376l3.6-2.684z" fill="#FBBC05"/><path d="M12.04 6.399c1.343 0 2.548.462 3.497 1.36l2.617-2.617c-1.514-1.395-3.585-2.142-6.114-2.142-3.751 0-6.892 2.342-8.397 5.312l3.6 2.684c.817-2.449 3.102-4.267 5.797-4.267z" fill="#EA4335"/></svg>
            Sign in with Google
          </button>
          <div className="w-full flex items-center my-3">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="mx-3 text-gray-400 text-sm">or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>
        </div>
        <div className="flex gap-2 mb-6">
          <button className={`btn flex-1 ${method === 'email' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMethod('email')} type="button">Login with Email</button>
          <button className={`btn flex-1 ${method === 'otp' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMethod('otp')} type="button">Login with Mobile & OTP</button>
        </div>

        {/* Email Login */}
        {method === 'email' && (
          <form onSubmit={handleEmailLogin} className="card-static p-6 sm:p-8 space-y-5">
            {/* Email */}
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="Enter your email"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            {/* Password */}
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Enter password"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-scale-in">
                <span className="flex-shrink-0">⚠</span> {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary w-full text-lg py-4" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Logging in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5" /> Login
                </span>
              )}
            </button>
            <p className="text-center text-sm text-gray-500">
              New here?{' '}
              <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                Create an account
              </Link>
            </p>
          </form>
        )}


        {/* Google Login */}
        {method === 'google' && (
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn btn-outline w-full text-lg py-3 mb-4 flex items-center justify-center gap-2"
            disabled={loading}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21.805 10.023h-9.765v3.977h5.588c-.241 1.285-1.03 2.377-2.199 3.093v2.572h3.548c2.078-1.916 3.298-4.74 2.828-7.642z" fill="#4285F4"/><path d="M12.04 21c2.47 0 4.541-.816 6.055-2.211l-3.548-2.572c-.984.661-2.24 1.054-3.507 1.054-2.695 0-4.98-1.818-5.797-4.267h-3.6v2.684c1.505 2.97 4.646 5.312 8.397 5.312z" fill="#34A853"/><path d="M6.243 13.004a5.996 5.996 0 0 1 0-3.008v-2.684h-3.6a9.003 9.003 0 0 0 0 8.376l3.6-2.684z" fill="#FBBC05"/><path d="M12.04 6.399c1.343 0 2.548.462 3.497 1.36l2.617-2.617c-1.514-1.395-3.585-2.142-6.114-2.142-3.751 0-6.892 2.342-8.397 5.312l3.6 2.684c.817-2.449 3.102-4.267 5.797-4.267z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
        )}

        {/* OTP Login (mobile) */}
        {method === 'otp' && (
          step === 'phone' ? (
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
          )
        )}
      </div>
    </div>
  );
}
