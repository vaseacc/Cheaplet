import { verifyTurnstile } from '../lib/verify-bot.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'Missing token' });

  const success = await verifyTurnstile(token, process.env.TURNSTILE_SECRET_KEY);
  res.status(success ? 200 : 403).json({
    success,
    message: success ? 'Human confirmed!' : 'Bot detected!'
  });
}
