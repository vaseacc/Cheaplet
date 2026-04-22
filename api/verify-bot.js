export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!token) {
      return res.status(400).json({ success: false, message: "Missing token" });
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`
    });

    const outcome = await response.json();

    if (outcome.success) {
      return res.status(200).json({ success: true, message: "Human confirmed!" });
    } else {
      return res.status(403).json({ success: false, message: "Bot detected!" });
    }
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return res.status(500).json({ success: false, message: "Verification service error" });
  }
}
