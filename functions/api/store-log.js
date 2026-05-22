// functions/api/store-log.js
// Cookie-based log store for Cloudflare Pages (persists across requests)

export async function onRequestPost({ request }) {
  try {
    const { message, type, details } = await request.json();
    const timestamp = new Date().toISOString();
    
    const newLog = { timestamp, type, message, details };
    
    // Get existing logs from cookie
    let logs = [];
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = {};
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        const key = parts.shift().trim();
        const value = decodeURIComponent(parts.join('='));
        cookies[key] = value;
      }
    });
    
    const cookieLogs = cookies.recent_logs;
    if (cookieLogs) {
      try {
        logs = JSON.parse(cookieLogs);
      } catch (e) {
        logs = [];
      }
    }

    // Add new log and keep only last 50
    logs.unshift(newLog);
    if (logs.length > 50) logs = logs.slice(0, 50);

    // Set cookie (expires in 1 hour)
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Set-Cookie', 
      `recent_logs=${encodeURIComponent(JSON.stringify(logs))}; Path=/; Max-Age=3600; SameSite=Lax`);
    
    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestGet({ request }) {
  // Retrieve logs from cookie
  let logs = [];
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const key = parts.shift().trim();
      const value = decodeURIComponent(parts.join('='));
      cookies[key] = value;
    }
  });
  
  const cookieLogs = cookies.recent_logs;
  if (cookieLogs) {
    try {
      logs = JSON.parse(cookieLogs);
    } catch (e) {
      logs = [];
    }
  }
  
  return new Response(JSON.stringify({ logs }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
