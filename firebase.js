// firebase.js (ES module)
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";

// --- Helper: Get the correct function URL for current environment ---
function getFunctionUrl(name) {
  return `/api/${name}`;
}

// --- Fetch config from backend and initialise Firebase ---
let config = null;
const savedConfig = sessionStorage.getItem('scoralia_config');

if (savedConfig) {
  config = JSON.parse(savedConfig);
} else {
  const res = await fetch(getFunctionUrl('config'));
  config = await res.json();
  sessionStorage.setItem('scoralia_config', JSON.stringify(config));
}

const app = getApps().length === 0 ? initializeApp(config.firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper: Convert Cloudinary URLs to WebP ---
function optimizeImageUrl(url) {
  if (!url) return url;
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    if (!url.includes('f_auto') && !url.includes('q_auto')) {
      return url.replace('/upload/', '/upload/f_auto,q_auto/');
    }
  }
  return url;
}

// --- Expose what every page needs ---
export {
  app,
  auth,
  db,
  getFunctionUrl,
  optimizeImageUrl,
  onAuthStateChanged
};
