import { moderateImage, containsForbiddenWords } from '../../lib/moderate-listing.js';

export async function onRequestPost({ request, env }) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  
  const allLogs = [];
  
  try {
    const { imageUrls = [], title = '', description = '' } = await request.json();
    
    console.log('[moderate-listing] Starting moderation for listing:', title);
    console.log('[moderate-listing] Image count:', imageUrls.length);
    
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
    console.log('[moderate-listing] Checking text content for forbidden words...');
    
    if (containsForbiddenWords(fullText)) {
      console.log('[moderate-listing] FORBIDDEN WORDS DETECTED!');
      
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
      
      return new Response(JSON.stringify({ 
        verdict: 'UNSAFE', 
        reason: 'Inappropriate language detected.',
        _debug: { check: 'text', matched: true }
      }), { headers });
    }
    
    console.log('[moderate-listing] Text check passed - no forbidden words');

    const tokens = [env.HUGGINGFACE_TOKEN, env.HUGGINGFACE_TOKEN_2].filter(Boolean);
    
    if (tokens.length === 0) {
      console.log('[moderate-listing] WARNING: No Hugging Face tokens configured');
      
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
      
      return new Response(JSON.stringify({ 
        verdict: 'SAFE', 
        reason: 'No tokens configured, bypassing check',
        _debug: { tokensConfigured: false }
      }), { headers });
    }
    
    console.log('[moderate-listing] Starting image analysis for', imageUrls.length, 'images');
    
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      console.log(`[moderate-listing] Analyzing image ${i + 1}/${imageUrls.length}:`, url.substring(0, 60));
      
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
      console.log(`[moderate-listing] Image ${i + 1} safety score:`, score);
      
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
        console.log('[moderate-listing] IMAGE FLAGGED AS UNSAFE! Score:', score);
        
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
          details: { score },
          _debug: { check: 'image', imageUrl: url.substring(0, 60), score }
        }), {
          status: 200,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    console.log('[moderate-listing] All checks passed - listing is SAFE');
    
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
    
    return new Response(JSON.stringify({ 
      verdict: 'SAFE',
      _debug: { checksPassed: ['text', 'images'], imageCount: imageUrls.length }
    }), { headers });
  } catch (err) {
    console.error('[moderate-listing] CRITICAL ERROR:', err.message);
    
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
    return new Response(JSON.stringify({ 
      verdict: 'SAFE', 
      reason: 'System bypass (error).',
      _debug: { error: err.message, stack: err.stack }
    }), { headers });
  }
}
