const cloudinary = require('cloudinary').v2;

exports.handler = async (event, context) => {
    const timestamp = Math.round((new Date()).getTime() / 1000);
    
    // Configure Cloudinary with your SECRET keys
    cloudinary.config({
        cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.VITE_CLOUDINARY_API_KEY, 
        api_secret: process.env.VITE_CLOUDINARY_API_SECRET 
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
