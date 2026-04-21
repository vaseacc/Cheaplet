export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const { token } = await request.json();
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
    status: outcome.success ? 200 : 403,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
