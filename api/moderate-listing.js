// api/moderate-listing.js

const cloudflare = {
  async onRequest({ request, env }) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

    try {
      const { imageUrls = [], title = '', description = '' } = await request.json();
      console.log('🔍 Moderation started:', title || '(no title)');

      // Local keyword filter
      const forbiddenWords = ['nude', 'nudes', 'porn', 'sex', 'escort', 'hookup', 'dick', 'pussy', 'onlyfans'];
      const fullText = `${title} ${description}`.toLowerCase();
      if (forbiddenWords.some(w => fullText.includes(w))) {
        return new Response(JSON.stringify({ verdict: 'UNSAFE', reason: 'Inappropriate language detected.' }), { headers });
      }

      // Hugging Face NSFW detection
      const HF_TOKEN = env.HUGGINGFACE_TOKEN;
      if (!HF_TOKEN) return new Response(JSON.stringify({ verdict: 'SAFE', details: 'No token' }), { headers });

      for (const imageUrl of imageUrls) {
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) continue;
        const imgBuffer = await imgRes.arrayBuffer();

        const hfRes = await fetch(
          'https://router.huggingface.co/hf-inference/models/Falconsai/nsfw_image_detection',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/octet-stream' },
            body: imgBuffer
          }
        );
        if (!hfRes.ok) {
          if (hfRes.status === 503) continue;
          continue;
        }
        const hfData = await hfRes.json();
        const nsfwItem = hfData.find(item => item.label === 'nsfw');
        const score = nsfwItem ? nsfwItem.score : 0;
        console.log(`📊 NSFW score: ${score}`);
        if (score > 0.70) {
          return new Response(JSON.stringify({ verdict: 'UNSAFE', reason: 'Image flagged as inappropriate.', details: { score } }), { headers });
        }
      }

      return new Response(JSON.stringify({ verdict: 'SAFE' }), { headers });
    } catch (error) {
      console.error('💥 Moderation error:', error.message);
      return new Response(JSON.stringify({ verdict: 'SAFE', reason: 'System bypass (error).' }), { headers });
    }
  }
};

async function vercelHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageUrls = [], title = '', description = '' } = req.body;
    console.log('🔍 Moderation started:', title || '(no title)');

    const forbiddenWords = ['nude', 'nudes', 'porn', 'sex', 'escort', 'hookup', 'dick', 'pussy', 'onlyfans'];
    const fullText = `${title} ${description}`.toLowerCase();
    if (forbiddenWords.some(w => fullText.includes(w))) {
      return res.status(200).json({ verdict: 'UNSAFE', reason: 'Inappropriate language detected.' });
    }

    const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
    if (!HF_TOKEN) return res.status(200).json({ verdict: 'SAFE', details: 'No token' });

    for (const imageUrl of imageUrls) {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) continue;
      const arrayBuffer = await imgRes.arrayBuffer();
      const imgBuffer = Buffer.from(arrayBuffer);

      const hfRes = await fetch(
        'https://router.huggingface.co/hf-inference/models/Falconsai/nsfw_image_detection',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/octet-stream' },
          body: imgBuffer
        }
      );
      if (!hfRes.ok) {
        if (hfRes.status === 503) continue;
        continue;
      }
      const hfData = await hfRes.json();
      const nsfwItem = hfData.find(item => item.label === 'nsfw');
      const score = nsfwItem ? nsfwItem.score : 0;
      console.log(`📊 NSFW score: ${score}`);
      if (score > 0.70) {
        return res.status(200).json({ verdict: 'UNSAFE', reason: 'Image flagged as inappropriate.', details: { score } });
      }
    }

    return res.status(200).json({ verdict: 'SAFE' });
  } catch (error) {
    console.error('💥 Moderation error:', error.message);
    return res.status(200).json({ verdict: 'SAFE', reason: 'System bypass (error).' });
  }
}

const isVercel = typeof process !== 'undefined' && process.env.VERCEL === '1';
export default isVercel ? vercelHandler : cloudflare;
