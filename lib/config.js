export function getFirebaseConfig(env, hostname, customAuthDomain) {
  // Use custom authDomain if provided, otherwise determine based on hostname
  let authDomain;
  if (customAuthDomain) {
    authDomain = customAuthDomain;
  } else if (hostname && !hostname.includes('firebaseapp.com')) {
    // For custom domains like scoralia.ca, use the custom domain itself
    authDomain = hostname.split(':')[0]; // Remove port if present
  } else {
    // Default to Firebase domain for firebaseapp.com hosting
    authDomain = "chaeplet.firebaseapp.com";
  }
  
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: authDomain,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
  };
}

export function getCloudinaryConfig(env) {
  return {
    cloudName: env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET
  };
}
