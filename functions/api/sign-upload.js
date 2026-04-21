import cloudinary from 'cloudinary';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  cloudinary.v2.config({
    cloud_name: env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: env.VITE_CLOUDINARY_API_KEY,
    api_secret: env.VITE_CLOUDINARY_API_SECRET
  });

  const timestamp = Math.round((new Date()).getTime() / 1000);
  const signature = cloudinary.v2.utils.api_sign_request({
    timestamp: timestamp,
    upload_preset: env.VITE_CLOUDINARY_UPLOAD_PRESET,
  }, env.VITE_CLOUDINARY_API_SECRET);

  return new Response(JSON.stringify({
    signature,
    timestamp,
    apiKey: env.VITE_CLOUDINARY_API_KEY,
    cloudName: env.VITE_CLOUDINARY_CLOUD_NAME,
    uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
