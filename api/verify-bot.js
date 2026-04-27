// api/verify-bot.js

const cloudflare = {
  async onRequest({ request, env }) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

    try {
      const { token } = await request.json();
      if (!token) return new Response(JSON.stringify({ success: false, message: 'Missing token' }), { status: 400, headers });

      const secretKey = env.TURNSTILE_SECRET_KEY;
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`
      });
      const outcome = await verifyRes.json();
      if (outcome.success) {
        return new Response(JSON.stringify({ success: true, message: 'Human confirmed!' }), { headers });
      } else {
        return new Response(JSON.stringify({ success: false, message: 'Bot detected!' }), { status: 403, headers });
      }
    } catch (error) {
      console.error('Turnstile error:', error);
      return new Response(JSON.stringify({ success: false, message: 'Verification service error' }), { status: 500, headers });
    }
  }
};

async function vercelHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Missing token' });

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`
    });
    const outcome = await verifyRes.json();
    if (outcome.success) {
      return res.status(200).json({ success: true, message: 'Human confirmed!' });
    } else {
      return res.status(403).json({ success: false, message: 'Bot detected!' });
    }
  } catch (error) {
    console.error('Turnstile error:', error);
    return res.status(500).json({ success: false, message: 'Verification service error' });
  }
}

const isVercel = typeof process !== 'undefined' && process.env.VERCEL === '1';
export default isVercel ? vercelHandler : cloudflare;
