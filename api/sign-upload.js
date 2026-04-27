// api/sign-upload.js
import { v2 as cloudinary } from 'cloudinary';

const cloudflare = {
  async onRequest({ request, env }) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers });

    cloudinary.config({
      cloud_name: env.VITE_CLOUDINARY_CLOUD_NAME,
      api_key: env.VITE_CLOUDINARY_API_KEY,
      api_secret: env.VITE_CLOUDINARY_API_SECRET
    });

    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request({
      timestamp,
      upload_preset: env.VITE_CLOUDINARY_UPLOAD_PRESET,
    }, env.VITE_CLOUDINARY_API_SECRET);

    return new Response(JSON.stringify({
      signature,
      timestamp,
      apiKey: env.VITE_CLOUDINARY_API_KEY,
      cloudName: env.VITE_CLOUDINARY_CLOUD_NAME,
      uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET
    }), { headers });
  }
};

async function vercelHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  cloudinary.config({
    cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.VITE_CLOUDINARY_API_KEY,
    api_secret: process.env.VITE_CLOUDINARY_API_SECRET
  });

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({
    timestamp,
    upload_preset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  }, process.env.VITE_CLOUDINARY_API_SECRET);

  return res.status(200).json({
    signature,
    timestamp,
    apiKey: process.env.VITE_CLOUDINARY_API_KEY,
    cloudName: process.env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET
  });
}

const isVercel = typeof process !== 'undefined' && process.env.VERCEL === '1';
export default isVercel ? vercelHandler : cloudflare;
