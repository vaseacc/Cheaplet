exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      firebaseConfig: {
        apiKey: "PASTE_YOUR_REAL_API_KEY_HERE",
        projectId: "chaeplet", // Use the spelling from your error log
        authDomain: "chaeplet.firebaseapp.com",
        storageBucket: "chaeplet.firebasestorage.app",
        messagingSenderId: "1060739540468",
        appId: "1:1060739540468:web:414048cdc72864b66dc5a1"
      },
      cloudinary: {
        cloudName: "delh8lebq",
        uploadPreset: "Cheaplet"
      }
    })
  };
};
