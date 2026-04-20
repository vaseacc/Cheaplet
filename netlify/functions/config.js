exports.handler = async function(event, context) {
  // SMART SECURITY: Allow requests from your own site, block direct URL visits
  const headers = event.headers;
  const origin = headers.origin || "";
  const referer = headers.referer || "";
  const host = headers.host || "";
  
  // Check if request comes from a Netlify domain OR localhost
  const isNetlify = origin.includes("netlify.app") || 
                    referer.includes("netlify.app") || 
                    host.includes("netlify.app");
                    
  const isLocal = origin.includes("localhost") || 
                  referer.includes("localhost") || 
                  host.includes("localhost") ||
                  host.includes("127.0.0.1");

  // Also allow requests with no Origin/Referer if they have a special header (optional)
  // This helps in some environments where headers are stripped.
  const hasAuthHeader = headers["x-requested-with"] === "XMLHttpRequest";

  const isAllowed = isNetlify || isLocal || hasAuthHeader;

  if (!isAllowed) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Access Denied" })
    };
  }

  // SEND CONFIGURATION
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      firebaseConfig: {
        apiKey: process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID,
        measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
      },
      cloudinary: {
        cloudName: process.env.VITE_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET
      }
    })
  };
};
