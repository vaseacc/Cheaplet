import { moderateImage, containsForbiddenWords } from '../../lib/moderate-listing.js';

export async function onRequestPost({ request, env }) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await request.json();
    const { imageUrls = [], title = '', description = '' } = body;
    
    // Log start
    console.log(`[moderate-listing] Listing moderation started - Title: "${title}", Images: ${imageUrls.length}`);
    
    // Send log to store-log endpoint
    const baseUrl = request.headers.get('host')?.includes('localhost') 
      ? 'http://localhost:8788' 
      : `https://${request.headers.get('host')}`;
    
    fetch(`${baseUrl}/api/store-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[moderate-listing] Listing moderation started - Title: "${title}"`,
        type: 'info'
      })
    }).catch(() => {});

    const fullText = `${title} ${description}`;
    if (containsForbiddenWords(fullText)) {
      console.log('[moderate-listing] Forbidden words detected');
      fetch(`${baseUrl}/api/store-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '[moderate-listing] Forbidden words detected',
          type: 'warning'
        })
      }).catch(() => {});
      
      return new Response(JSON.stringify({ verdict: 'UNSAFE', reason: 'Inappropriate language detected.' }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    const tokens = [env.HUGGINGFACE_TOKEN, env.HUGGINGFACE_TOKEN_2].filter(Boolean);
    
    if (tokens.length === 0) {
      console.log('[moderate-listing] Missing Hugging Face tokens - bypassing check');
      fetch(`${baseUrl}/api/store-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '[moderate-listing] Missing Hugging Face tokens - bypassing check',
          type: 'error'
        })
      }).catch(() => {});
      
      return new Response(JSON.stringify({ verdict: 'SAFE', reason: 'No tokens configured, bypassing check' }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    for (const url of imageUrls) {
      console.log(`[moderate-listing] Analyzing image: ${url.substring(0, 60)}...`);
      fetch(`${baseUrl}/api/store-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[moderate-listing] Analyzing image`,
          type: 'info'
        })
      }).catch(() => {});
      
      const { score } = await moderateImage(url, tokens);
      
      console.log(`[moderate-listing] Image analysis complete - Score: ${score}`);
      fetch(`${baseUrl}/api/store-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[moderate-listing] Image analysis complete - Score: ${score}`,
          type: 'info'
        })
      }).catch(() => {});
      
      if (score > 0.70) {
        console.log(`[moderate-listing] Image flagged as unsafe (score: ${score})`);
        fetch(`${baseUrl}/api/store-log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `[moderate-listing] Image flagged as unsafe (score: ${score})`,
            type: 'warning'
          })
        }).catch(() => {});
        
        return new Response(JSON.stringify({
          verdict: 'UNSAFE',
          reason: 'Image flagged as inappropriate.',
          details: { score }
        }), {
          status: 200,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    console.log('[moderate-listing] Listing approved as SAFE');
    fetch(`${baseUrl}/api/store-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '[moderate-listing] Listing approved as SAFE',
        type: 'success'
      })
    }).catch(() => {});
    
    return new Response(JSON.stringify({ verdict: 'SAFE' }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(`[moderate-listing] Critical error: ${err.message}`);
    fetch(`${baseUrl}/api/store-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[moderate-listing] Critical error: ${err.message}`,
        type: 'error'
      })
    }).catch(() => {});
    
    return new Response(JSON.stringify({ verdict: 'SAFE', reason: 'System bypass (error).' }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
}
