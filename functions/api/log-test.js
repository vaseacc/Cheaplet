export async function onRequestPost({ request, env }) {
  try {
    const { message } = await request.json();
    
    // Log to console (visible in Cloudflare dashboard logs)
    console.log(`[DIAGNOSTIC LOG] ${new Date().toISOString()} - ${message}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Log recorded',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
