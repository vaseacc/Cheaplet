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
    
    // Log start
    console.log(`[moderate-listing] Listing moderation started - Title: "${title}", Images: ${imageUrls.length}`);
    await sendLog(`[moderate-listing] Listing moderation started - Title: "${title}", Images: ${imageUrls.length}`, 'info');

    const fullText = `${title} ${description}`;
    if (containsForbiddenWords(fullText)) {
      console.log(`[moderate-listing] Forbidden words detected`);
      await sendLog(`[moderate-listing] Forbidden words detected`, 'warning');
      
      return res.status(200).json({ verdict: 'UNSAFE', reason: 'Inappropriate language detected.' });
    }

    const tokens = [process.env.HUGGINGFACE_TOKEN, process.env.HUGGINGFACE_TOKEN_2].filter(Boolean);
    
    if (tokens.length === 0) {
      console.log('[moderate-listing] Missing Hugging Face tokens - bypassing check');
      await sendLog('[moderate-listing] Missing Hugging Face tokens - bypassing check', 'error');
      
      return res.status(200).json({ verdict: 'SAFE', reason: 'No tokens configured, bypassing check' });
    }

    for (const url of imageUrls) {
      console.log(`[moderate-listing] Analyzing image: ${url.substring(0, 60)}...`);
      await sendLog(`[moderate-listing] Analyzing image: ${url.substring(0, 60)}...`, 'info');
      
      const { score } = await moderateImage(url, tokens);
      
      console.log(`[moderate-listing] Image analysis complete - Score: ${score}`);
      await sendLog(`[moderate-listing] Image analysis complete - Score: ${score}`, 'info');
      
      if (score > 0.70) {
        console.log(`[moderate-listing] Image flagged as unsafe (score: ${score})`);
        await sendLog(`[moderate-listing] Image flagged as unsafe (score: ${score})`, 'warning');
        
        return res.status(200).json({
          verdict: 'UNSAFE',
          reason: 'Image flagged as inappropriate.',
          details: { score }
        });
      }
    }
    
    console.log('[moderate-listing] Listing approved as SAFE');
    await sendLog('[moderate-listing] Listing approved as SAFE', 'success');
    
    return res.status(200).json({ verdict: 'SAFE' });
  } catch (err) {
    console.error(`[moderate-listing] Critical error: ${err.message}`);
    await sendLog(`[moderate-listing] Critical error: ${err.message}`, 'error');
    
    return res.status(200).json({ verdict: 'SAFE', reason: 'System bypass (error).' });
  }
}
