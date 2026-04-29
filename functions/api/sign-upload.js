import { generateSignature } from '../../lib/sign-upload.js';

export async function onRequest({ request, env }) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers });

  const timestamp = Math.round(Date.now() / 1000);
  const params = {
    timestamp,
    upload_preset: env.VITE_CLOUDINARY_UPLOAD_PRESET
  };

  try {
    const signature = await generateSignature(params, env.VITE_CLOUDINARY_API_SECRET);
    return new Response(JSON.stringify({
      signature,
      timestamp,
      apiKey: env.VITE_CLOUDINARY_API_KEY,
      cloudName: env.VITE_CLOUDINARY_CLOUD_NAME,
      uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET
    }), { headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Signature generation failed' }), { status: 500, headers });
  }
}
