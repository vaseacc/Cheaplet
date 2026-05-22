import { moderateImage, containsForbiddenWords } from '../../lib/moderate-listing.js';

export async function onRequest({ request, env }) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  
  try {
    const { imageUrls = [], title = '', description = '' } = await request.json();
    
    // Log start
    fetch('/api/store-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[moderate-listing] Listing moderation started - Title: "${title}", Images: ${imageUrls.length}`,
        type: 'info'
      })
    }).catch(() => {});

    const fullText = `${title} ${description}`;
    if (containsForbiddenWords(fullText)) {
      fetch('/api/store-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[moderate-listing] Forbidden words detected in: "${fullText.substring(0, 50)}..."`,
          type: 'warning'
        })
      }).catch(() => {});
      
      return new Response(JSON.stringify({ verdict: 'UNSAFE', reason: 'Inappropriate language detected.' }), { headers });
    }

    const tokens = [env.HUGGINGFACE_TOKEN, env.HUGGINGFACE_TOKEN_2].filter(Boolean);
    
    if (tokens.length === 0) {
      fetch('/api/store-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '[moderate-listing] Missing Hugging Face tokens - bypassing check',
          type: 'error'
        })
      }).catch(() => {});
      
      return new Response(JSON.stringify({ verdict: 'SAFE', reason: 'No tokens configured, bypassing check' }), { headers });
    }
    
    for (const url of imageUrls) {
      fetch('/api/store-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[moderate-listing] Analyzing image: ${url.substring(0, 60)}...`,
          type: 'info'
        })
      }).catch(() => {});
      
      const { score } = await moderateImage(url, tokens);
      
      fetch('/api/store-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[moderate-listing] Image analysis complete - Score: ${score}`,
          type: 'info'
        })
      }).catch(() => {});
      
      if (score > 0.70) {
        fetch('/api/store-log', {
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
        }), { headers });
      }
    }
    
    fetch('/api/store-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '[moderate-listing] Listing approved as SAFE',
        type: 'success'
      })
    }).catch(() => {});
    
    return new Response(JSON.stringify({ verdict: 'SAFE' }), { headers });
  } catch (err) {
    fetch('/api/store-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[moderate-listing] Critical error: ${err.message}`,
        type: 'error'
      })
    }).catch(() => {});
    
    console.error(err);
    return new Response(JSON.stringify({ verdict: 'SAFE', reason: 'System bypass (error).' }), { headers });
  }
}
