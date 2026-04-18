exports.handler = async function(event, context) {
  // 1. SMART SECURITY SHIELD
  // Gets the origin of the request.
  const referer = event.headers.referer || event.headers.origin || "";
  
  // Checks if the request is actually coming from a Netlify website or your local computer.
  // This prevents hackers from pasting the link in their browser to steal keys, 
  // but won't break your site if you change your Netlify URL name!
  const isAllowed = referer.includes("netlify.app") || referer.includes("localhost") || referer.includes("127.0.0.1");

  if (!isAllowed) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Access Denied. Nice try! 😉" })
    };
  }

  // 2. SEND CONFIGURATION
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Crucial: Allows your frontend to read the data
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
