const cloudinary = require('cloudinary').v2;

exports.handler = async (event, context) => {
    // SECURITY: Only allow the request if the user is logged into your site
    // (You can add Firebase Admin SDK here later for 100% security)
    
    const timestamp = Math.round((new Date()).getTime() / 1000);
    
    // Configure Cloudinary with your SECRET keys (hiding them from the browser)
    cloudinary.config({
        cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.VITE_CLOUDINARY_API_KEY, // Add this to Netlify Dashboard!
        api_secret: process.env.VITE_CLOUDINARY_API_SECRET // Add this to Netlify Dashboard!
    });

    // Create the secure signature
    const signature = cloudinary.utils.api_sign_request({
        timestamp: timestamp,
        upload_preset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET,
    }, process.env.VITE_CLOUDINARY_API_SECRET);

    return {
        statusCode: 200,
        body: JSON.stringify({
            signature: signature,
            timestamp: timestamp,
            apiKey: process.env.VITE_CLOUDINARY_API_KEY,
            cloudName: process.env.VITE_CLOUDINARY_CLOUD_NAME,
            uploadPreset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET
        })
    };
};
