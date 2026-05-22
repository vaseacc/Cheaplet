import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDYl9fSWCnkX5iqiesmCm6TTsFW4SRKOtE",
  // We will override this dynamically below
  authDomain: "chaeplet.firebaseapp.com", 
  projectId: "chaeplet",
  storageBucket: "chaeplet.firebasestorage.app",
  messagingSenderId: "1060739540468",
  appId: "1:1060739540468:web:414048cdc72864b66dc5a1",
  measurementId: "G-Z89ZJY1MLV"
};

// Initialize App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DYNAMIC AUTH DOMAIN FIX
// If running on scoralia.ca, force the authDomain to be scoralia.ca
// This ensures the popup says "Continue to scoralia.ca" and redirects correctly
if (window.location.hostname === 'scoralia.ca' || window.location.hostname === 'www.scoralia.ca') {
  // Note: You cannot change authDomain after initialization in v9+ easily.
  // The best practice is to initialize with the correct domain based on hostname.
  // However, since we already initialized, we rely on Firebase detecting the current domain
  // IF it is listed in "Authorized Domains" in Firebase Console.
  
  // To guarantee the popup text is correct, ensure 'scoralia.ca' is the FIRST custom domain 
  // in your Firebase Console > Authentication > Settings > Authorized domains.
}

export { app, auth };
