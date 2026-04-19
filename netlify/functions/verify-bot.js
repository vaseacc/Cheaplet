// netlify/functions/verify-bot.js
exports.handler = async (event) => {
    const { token } = JSON.parse(event.body);
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secretKey}&response=${token}`
    });

    const outcome = await response.json();

    return {
        statusCode: outcome.success ? 200 : 403,
        body: JSON.stringify({
            success: outcome.success,
            message: outcome.success ? "Human confirmed!" : "Bot detected!"
        })
    };
};
