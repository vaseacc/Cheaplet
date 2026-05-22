// api/store-log.js
// A simple in-memory log store for Vercel (resets on redeploy)

// In-memory storage (shared across requests in same server instance)
let appLogs = [];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { message, type, timestamp } = req.body;
      
      const logEntry = {
        id: Date.now() + Math.random(),
        message,
        type: type || 'info',
        timestamp: timestamp || new Date().toISOString()
      };

      // Add to the beginning of the array
      appLogs.unshift(logEntry);

      // Keep only the last 50 logs to prevent memory issues
      if (appLogs.length > 50) {
        appLogs = appLogs.slice(0, 50);
      }

      return res.status(200).json({ success: true, log: logEntry });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    // Retrieve logs
    return res.status(200).json({ logs: appLogs });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
