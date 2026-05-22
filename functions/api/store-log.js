// functions/api/store-log.js
// A simple in-memory log store (resets on redeploy)

export async function onRequestPost({ request, env }) {
  try {
    const { message, type, timestamp } = await request.json();
    
    // Initialize logs array in memory if not exists
    if (typeof globalThis.appLogs === 'undefined') {
      globalThis.appLogs = [];
    }

    const logEntry = {
      id: Date.now() + Math.random(),
      message,
      type: type || 'info',
      timestamp: timestamp || new Date().toISOString()
    };

    // Add to the beginning of the array
    globalThis.appLogs.unshift(logEntry);

    // Keep only the last 50 logs to prevent memory issues
    if (globalThis.appLogs.length > 50) {
      globalThis.appLogs = globalThis.appLogs.slice(0, 50);
    }

    return new Response(JSON.stringify({ success: true, log: logEntry }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestGet({ request, env }) {
  // Retrieve logs
  const logs = typeof globalThis.appLogs !== 'undefined' ? globalThis.appLogs : [];
  
  return new Response(JSON.stringify({ logs }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
