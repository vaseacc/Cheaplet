// Hybrid function for Netlify & Cloudflare Pages
const cloudinary = require('cloudinary').v2;

async function coreHandler(requestBody, headers, env) {
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

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      signature,
      timestamp,
      apiKey: env.VITE_CLOUDINARY_API_KEY,
      cloudName: env.VITE_CLOUDINARY_CLOUD_NAME,
      uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET
    })
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" }
      });
    }
    const result = await coreHandler(null, request.headers, env);
    return new Response(result.body, {
      status: result.statusCode,
      headers: result.headers
    });
  }
};

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" },
      body: ""
    };
  }
  return coreHandler(event.body, event.headers, process.env);
};
