exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      // This will show us if Netlify even sees the keys at all
      debug: {
        hasApiKey: !!process.env.FIREBASE_API_KEY,
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        allKeys: Object.keys(process.env).filter(k => k.includes("FIREBASE"))
      },
      firebaseConfig: {
        apiKey: process.env.FIREBASE_API_KEY || "NOT_FOUND",
        projectId: process.env.FIREBASE_PROJECT_ID || "NOT_FOUND",
        // ... add the rest if you want
      }
    })
  };
};
