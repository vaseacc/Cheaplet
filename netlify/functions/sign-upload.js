const cloudinary = require('cloudinary').v2;

exports.handler = async (event, context) => {
    try {
        // Configure Cloudinary with environment variables
        cloudinary.config({
            cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
            api_key: process.env.VITE_CLOUDINARY_API_KEY,
            api_secret: process.env.VITE_CLOUDINARY_API_SECRET
        });

        const timestamp = Math.round((new Date()).getTime() / 1000);
        
        // Create the secure signature
        const signature = cloudinary.utils.api_sign_request({
            timestamp: timestamp,
            upload_preset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET,
        }, process.env.VITE_CLOUDINARY_API_SECRET);

        console.log('Sign-upload success - timestamp:', timestamp);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                signature: signature,
                timestamp: timestamp,
                apiKey: process.env.VITE_CLOUDINARY_API_KEY,
                cloudName: process.env.VITE_CLOUDINARY_CLOUD_NAME,
                uploadPreset: process.env.VITE_CLOUDINARY_UPLOAD_PRESET
            })
        };
    } catch (error) {
        console.error('Sign-upload error:', error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ 
                error: "Failed to generate signature",
                details: error.message 
            })
        };
    }
};
