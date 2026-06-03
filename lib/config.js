export function getFirebaseConfig(env, hostname, customAuthDomain) {
  // Use custom auth domain for branded Google login
  const authDomain = "auth.scoralia.ca";
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
