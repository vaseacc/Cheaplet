// Cloudflare Pages Function: /functions/verify-bot.js
export async function onRequest(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const env = context.env;
  const { token } = await context.request.json();
  const secretKey = env.TURNSTILE_SECRET_KEY;

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${secretKey}&response=${token}`
  });

  const outcome = await response.json();

  return new Response(JSON.stringify({
    success: outcome.success,
    message: outcome.success ? "Human confirmed!" : "Bot detected!"
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
