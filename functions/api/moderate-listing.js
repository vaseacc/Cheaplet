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
        source: 'moderate-listing',
        level: 'info',
        message: 'Listing moderation started',
        data: { title, imageCount: imageUrls.length }
      })
    }).catch(() => {});

    const fullText = `${title} ${description}`;
    if (containsForbiddenWords(fullText)) {
      fetch('/api/store-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'moderate-listing',
          level: 'warning',
          message: 'Forbidden words detected',
          data: { text: fullText.substring(0, 50) }
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
          source: 'moderate-listing',
          level: 'error',
          message: 'Missing Hugging Face tokens',
          data: {}
        })
      }).catch(() => {});
      
      return new Response(JSON.stringify({ verdict: 'SAFE', reason: 'No tokens configured, bypassing check' }), { headers });
    }
    
    for (const url of imageUrls) {
      fetch('/api/store-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'moderate-listing',
          level: 'info',
          message: `Analyzing image: ${url.substring(0, 40)}...`,
          data: { url }
        })
      }).catch(() => {});
      
      const { score } = await moderateImage(url, tokens);
      
      fetch('/api/store-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'moderate-listing',
          level: 'info',
          message: `Image analysis complete`,
          data: { url: url.substring(0, 40), score }
        })
      }).catch(() => {});
      
      if (score > 0.70) {
        fetch('/api/store-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'moderate-listing',
            level: 'warning',
            message: 'Image flagged as unsafe',
            data: { score }
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
        source: 'moderate-listing',
        level: 'success',
        message: 'Listing approved as SAFE',
        data: {}
      })
    }).catch(() => {});
    
    return new Response(JSON.stringify({ verdict: 'SAFE' }), { headers });
  } catch (err) {
    fetch('/api/store-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'moderate-listing',
        level: 'error',
        message: 'Critical error in moderation',
        data: { error: err.message }
      })
    }).catch(() => {});
    
    console.error(err);
    return new Response(JSON.stringify({ verdict: 'SAFE', reason: 'System bypass (error).' }), { headers });
  }
}
