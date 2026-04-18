// Cloudflare Pages Function: /functions/config.js
export async function onRequest(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  // Handle CORS preflight
  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Cloudflare environment variables are in context.env
  const env = context.env;

  // You must add these variables in Cloudflare Dashboard > Pages > Settings > Environment variables
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
  };

  const cloudinary = {
    cloudName: env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET
  };

  return new Response(JSON.stringify({ firebaseConfig, cloudinary }), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}
