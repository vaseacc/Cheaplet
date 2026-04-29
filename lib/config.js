export function getFirebaseConfig(env, hostname, customAuthDomain) {
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: customAuthDomain || env.VITE_FIREBASE_AUTH_DOMAIN || hostname,
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
