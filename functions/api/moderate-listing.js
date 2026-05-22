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
    
    const log = (msg) => {
      console.log(msg);
      allLogs.push(msg);
    };
    
    log('[moderate-listing] Starting moderation for listing: ' + title);
    log('[moderate-listing] Image count: ' + imageUrls.length);
    
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
    log('[moderate-listing] Checking text content for forbidden words...');
    
    if (containsForbiddenWords(fullText)) {
      log('[moderate-listing] FORBIDDEN WORDS DETECTED!');
      
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
        _debug: { check: 'text', matched: true, logs: allLogs }
      }), { headers });
    }
    
    log('[moderate-listing] Text check passed - no forbidden words');

    const tokens = [env.HUGGINGFACE_TOKEN, env.HUGGINGFACE_TOKEN_2].filter(Boolean);
    
    if (tokens.length === 0) {
      log('[moderate-listing] WARNING: No Hugging Face tokens configured');
      
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
        _debug: { tokensConfigured: false, logs: allLogs }
      }), { headers });
    }
    
    log('[moderate-listing] Starting image analysis for ' + imageUrls.length + ' images');
    log('[moderate-listing] Using HuggingFace API for image moderation');
    
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      log(`[moderate-listing] Analyzing image ${i + 1}/${imageUrls.length}: ${url.substring(0, 60)}`);
      
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
      
      const result = await moderateImage(url, tokens);
      const score = result.score;
      
      // Add HuggingFace logs to our logs
      if (result.logs && Array.isArray(result.logs)) {
        result.logs.forEach(hfLog => {
          log(`[HuggingFace] ${hfLog}`);
        });
      }
      
      log(`[moderate-listing] Image ${i + 1} safety score: ${score}`);
      
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
        log('[moderate-listing] IMAGE FLAGGED AS UNSAFE! Score: ' + score);
        
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
          _debug: { check: 'image', imageUrl: url.substring(0, 60), score, logs: allLogs }
        }), {
          status: 200,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    log('[moderate-listing] All checks passed - listing is SAFE');
    
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
      _debug: { checksPassed: ['text', 'images'], imageCount: imageUrls.length, logs: allLogs }
    }), { headers });
  } catch (err) {
    const errorMsg = '[moderate-listing] CRITICAL ERROR: ' + err.message;
    console.error(errorMsg);
    allLogs.push(errorMsg);
    allLogs.push(err.stack || '');
    
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
      _debug: { error: err.message, stack: err.stack, logs: allLogs }
    }), { headers });
  }
}
