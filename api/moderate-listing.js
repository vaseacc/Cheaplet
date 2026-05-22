import { moderateImage, containsForbiddenWords } from '../lib/moderate-listing.js';

// Helper to send logs synchronously (works on Vercel)
async function sendLog(message, type) {
  try {
    // Use absolute URL for Vercel serverless functions
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
      
    await fetch(`${baseUrl}/api/store-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, type })
    });
  } catch (e) {
    // Silent fail - logging shouldn't break the main flow
    console.log('Log send failed:', e.message);
  }
}

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
      
      return res.status(200).json({ verdict: 'UNSAFE', reason: 'Inappropriate language detected.' });
    }

    const tokens = [process.env.HUGGINGFACE_TOKEN, process.env.HUGGINGFACE_TOKEN_2].filter(Boolean);
    
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
      
      return res.status(200).json({ verdict: 'SAFE', reason: 'No tokens configured, bypassing check' });
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
        source: 'moderate-listing',
        level: 'success',
        message: 'Listing approved as SAFE',
        data: {}
      })
    }).catch(() => {});
    
    return res.status(200).json({ verdict: 'SAFE' });
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
    return res.status(200).json({ verdict: 'SAFE', reason: 'System bypass (error).' });
  }
}
