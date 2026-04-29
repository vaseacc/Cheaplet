import { verifyTurnstile } from '../../lib/verify-bot.js';

export async function onRequest({ request, env }) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  const { token } = await request.json();
  if (!token) return new Response(JSON.stringify({ success: false, message: 'Missing token' }), { status: 400, headers });

  const success = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY);
  const message = success ? 'Human confirmed!' : 'Bot detected!';
  return new Response(JSON.stringify({ success, message }), {
    status: success ? 200 : 403,
    headers
  });
}
