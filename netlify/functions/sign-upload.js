const cloudinary = require('cloudinary').v2;

async function handleRequest(request, env) {
  cloudinary.config({
    cloud_name: env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: env.VITE_CLOUDINARY_API_KEY,
    api_secret: env.VITE_CLOUDINARY_API_SECRET
  });

  const timestamp = Math.round((new Date()).getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request({
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
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" }
    });
  }
  return handleRequest(request, env);
}

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" },
      body: ""
    };
  }
  const response = await handleRequest({ method: event.httpMethod }, process.env);
  const body = await response.text();
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers),
    body
  };
};
