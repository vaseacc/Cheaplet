// Hybrid function for Netlify & Cloudflare Pages
async function coreHandler(requestBody, headers, env) {
  const { token } = JSON.parse(requestBody);
  const secretKey = env.TURNSTILE_SECRET_KEY;

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
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" }
      });
    }
    const body = await request.text();
    const result = await coreHandler(body, request.headers, env);
    return new Response(result.body, {
      status: result.statusCode,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
};

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" },
      body: ""
    };
  }
  return coreHandler(event.body, event.headers, process.env);
};
