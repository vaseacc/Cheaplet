exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
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
      // Change this line to include your NEW URL
const isAllowed = referer.includes("cheaplett.netlify.app") || referer.includes("localhost");
    })
  };
};
