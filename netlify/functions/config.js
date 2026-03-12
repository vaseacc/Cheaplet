exports.handler = async function(event, context) {
  // 1. Get the origin of the request
  const referer = event.headers.referer || event.headers.origin || "";
  
  // 2. Check if the request is coming from your website (or localhost for testing)
  // NOTE: If you buy a custom domain later (like cheaplet.com), add it to this list!
  const isAllowed = referer.includes("cheaplet.netlify.app") || referer.includes("localhost");

  // 3. If they typed the URL directly or are trying to steal it from another site, BLOCK THEM
  if (!isAllowed) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Access Denied. Nice try! 😉" })
    };
  }

  // 4. If it's your website asking, send the data
  return {
    statusCode: 200,
    body: JSON.stringify({
      firebaseConfig: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
      },
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
      }
    })
  };
};
