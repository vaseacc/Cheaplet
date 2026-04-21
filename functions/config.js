// functions/config.js
export async function onRequest(context) {
  // Handle CORS preflight requests
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Your existing logic to fetch config
  const firebaseConfig = {
    apiKey: context.env.VITE_FIREBASE_API_KEY,
    // ... rest of your Firebase config
  };

  const cloudinary = {
    cloudName: context.env.VITE_CLOUDINARY_CLOUD_NAME,
    // ... rest of your Cloudinary config
  };

  return new Response(JSON.stringify({ firebaseConfig, cloudinary }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
