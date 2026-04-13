// netlify/functions/verify-bot.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
    const { token } = JSON.parse(event.body);
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    // Call Cloudflare API to verify the token
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secretKey}&response=${token}`
    });

    const outcome = await response.json();

    if (outcome.success) {
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: "Human confirmed!" })
        };
    } else {
        return {
            statusCode: 403,
            body: JSON.stringify({ success: false, message: "Bot detected!" })
        };
    }
};
