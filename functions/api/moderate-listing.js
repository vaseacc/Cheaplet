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
    const fullText = `${title} ${description}`;
    if (containsForbiddenWords(fullText)) {
      return new Response(JSON.stringify({ verdict: 'UNSAFE', reason: 'Inappropriate language detected.' }), { headers });
    }

    const tokens = [env.HUGGINGFACE_TOKEN, env.HUGGINGFACE_TOKEN_2].filter(Boolean);
    for (const url of imageUrls) {
      const { score } = await moderateImage(url, tokens);
      if (score > 0.70) {
        return new Response(JSON.stringify({
          verdict: 'UNSAFE',
          reason: 'Image flagged as inappropriate.',
          details: { score }
        }), { headers });
      }
    }
    return new Response(JSON.stringify({ verdict: 'SAFE' }), { headers });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ verdict: 'SAFE', reason: 'System bypass (error).' }), { headers });
  }
}
