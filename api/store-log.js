// api/store-log.js
// A simple cookie-based log store for Vercel (persists across requests)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Helper to parse cookies
  const parseCookies = (cookieHeader) => {
    if (!cookieHeader) return {};
    const cookies = {};
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        const key = parts.shift().trim();
        const value = decodeURIComponent(parts.join('='));
        cookies[key] = value;
      }
    });
    return cookies;
  };

  if (req.method === 'POST') {
    try {
      const { message, type, details } = req.body;
      const timestamp = new Date().toISOString();
      
      const newLog = { timestamp, type, message, details };
      
      // Get existing logs from cookie
      let logs = [];
      const allCookies = parseCookies(req.headers.cookie || '');
      const cookieHeader = allCookies.recent_logs;
      
      if (cookieHeader) {
        try {
          logs = JSON.parse(cookieHeader);
        } catch (e) {
          logs = [];
        }
      }

      // Add new log and keep only last 50
      logs.unshift(newLog);
      if (logs.length > 50) logs = logs.slice(0, 50);

      // Set cookie (expires in 1 hour)
      res.setHeader('Set-Cookie', 
        `recent_logs=${encodeURIComponent(JSON.stringify(logs))}; Path=/; Max-Age=3600; SameSite=Lax`);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    // Retrieve logs from cookie
    let logs = [];
    const allCookies = parseCookies(req.headers.cookie || '');
    const cookieHeader = allCookies.recent_logs;
    
    if (cookieHeader) {
      try {
        logs = JSON.parse(cookieHeader);
      } catch (e) {
        logs = [];
      }
    }
    return res.status(200).json({ logs });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
