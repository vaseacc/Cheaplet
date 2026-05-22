import { moderateImage, containsForbiddenWords } from '../lib/moderate-listing.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageUrls = [], title = '', description = '' } = req.body;
    
    // Log start (works on both Vercel and Cloudflare)
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
      
      return res.status(200).json({ verdict: 'UNSAFE', reason: 'Inappropriate language detected.' });
    }

    const tokens = [process.env.HUGGINGFACE_TOKEN, process.env.HUGGINGFACE_TOKEN_2].filter(Boolean);
    
    if (tokens.length === 0) {
      fetch('/api/store-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '[moderate-listing] Missing Hugging Face tokens - bypassing check',
          type: 'error'
        })
      }).catch(() => {});
      
      return res.status(200).json({ verdict: 'SAFE', reason: 'No tokens configured, bypassing check' });
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
        
        return res.status(200).json({
          verdict: 'UNSAFE',
          reason: 'Image flagged as inappropriate.',
          details: { score }
        });
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
    
    return res.status(200).json({ verdict: 'SAFE' });
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
    return res.status(200).json({ verdict: 'SAFE', reason: 'System bypass (error).' });
  }
}
