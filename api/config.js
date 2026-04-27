// api/config.js
// Works on both Vercel and Cloudflare Pages

// Cloudflare Pages Function
const cloudflare = {
  async onRequest({ request, env }) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers });

    const url = new URL(request.url);
    const hostname = url.hostname;

    const firebaseConfig = {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: hostname,
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
    return new Response(JSON.stringify({ firebaseConfig, cloudinary }), { headers });
  }
};

// Vercel serverless function
async function vercelHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: req.headers.host,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
  };
  const cloudinary = {
    cloudName: process.env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET
  };
  return res.status(200).json({ firebaseConfig, cloudinary });
}

// 🧠 Auto‑detect platform
const isVercel = typeof process !== 'undefined' && process.env.VERCEL === '1';
export default isVercel ? vercelHandler : cloudflare;
