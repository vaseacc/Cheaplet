// Hybrid function for Netlify & Cloudflare Pages
async function coreHandler(requestBody, headers, env) {
  // Your existing config logic
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

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({ firebaseConfig, cloudinary })
  };
}

// =============================================
// RUNTIME DETECTION & ADAPTER
// =============================================
export default {
  async fetch(request, env, ctx) {
    // Cloudflare Pages Functions entry point (must be default export)
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

// Netlify Functions entry point
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
