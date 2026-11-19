import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCmb8Ym6EIakG9Qv82x4im8GYZSWT4QQCw",
  authDomain: "mandi-connect-1fba7.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://mandi-connect-1fba7-default-rtdb.firebaseio.com",
  projectId: "mandi-connect-1fba7",
  storageBucket: "mandi-connect-1fba7.firebasestorage.app",
  messagingSenderId: "698192581639",
  appId: "1:698192581639:web:88e5ba50892bf52c87c6a2",
  measurementId: "G-0MD2LS9J4L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let analytics = null;
isSupported().then((ok) => {
  if (ok) analytics = getAnalytics(app);
});

export { app, auth, db, analytics, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup };
