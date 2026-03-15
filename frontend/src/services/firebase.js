import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCmb8Ym6EIakG9Qv82x4im8GYZSWT4QQCw",
  authDomain: "mandi-connect-1fba7.firebaseapp.com",
  projectId: "mandi-connect-1fba7",
  storageBucket: "mandi-connect-1fba7.firebasestorage.app",
  messagingSenderId: "698192581639",
  appId: "1:698192581639:web:88e5ba50892bf52c87c6a2",
  measurementId: "G-0MD2LS9J4L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let analytics = null;
isSupported().then((ok) => {
  if (ok) analytics = getAnalytics(app);
});

export { app, auth, analytics, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup };
