const cloudinary = require('cloudinary').v2;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
