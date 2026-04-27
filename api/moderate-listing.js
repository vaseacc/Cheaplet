// functions/api/moderate-listing.js
// Vercel serverless function – uses process.env, CommonJS-style handler

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageUrls = [], title = '', description = '' } = req.body;

    console.log('🔍 Moderation started:', title || '(no title)');

    // 1. Local keyword filter
    const forbiddenWords = ['nude', 'nudes', 'porn', 'sex', 'escort', 'hookup', 'dick', 'pussy', 'onlyfans'];
    const fullText = `${title} ${description}`.toLowerCase();
    if (forbiddenWords.some(w => fullText.includes(w))) {
      return res.status(200).json({ verdict: 'UNSAFE', reason: 'Inappropriate language detected.' });
    }

    // 2. Hugging Face image moderation
    const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
    if (!HF_TOKEN) {
      console.warn('⚠️ HUGGINGFACE_TOKEN not set – skipping image moderation.');
      return res.status(200).json({ verdict: 'SAFE', details: 'No token' });
    }

    for (const imageUrl of imageUrls) {
      try {
        // Download image
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) {
          console.warn(`⚠️ Could not download image (status ${imgRes.status}), skipping.`);
          continue;
        }

        const arrayBuffer = await imgRes.arrayBuffer();
        const imgBuffer = Buffer.from(arrayBuffer);

        // Send to Hugging Face
        const hfRes = await fetch(
          'https://router.huggingface.co/hf-inference/models/Falconsai/nsfw_image_detection',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HF_TOKEN}`,
              'Content-Type': 'application/octet-stream'
            },
            body: imgBuffer
          }
        );

        if (!hfRes.ok) {
          const errText = await hfRes.text();
          console.error(`❌ Hugging Face API error (status ${hfRes.status}):`, errText);
          if (hfRes.status === 503) continue; // model loading – skip
          continue; // other errors – skip
        }

        const hfData = await hfRes.json();
        const nsfwItem = hfData.find(item => item.label === 'nsfw');
        const score = nsfwItem ? nsfwItem.score : 0;
        console.log(`📊 NSFW score: ${score}`);

        if (score > 0.70) {
          return res.status(200).json({
            verdict: 'UNSAFE',
            reason: 'Image flagged as inappropriate.',
            details: { score }
          });
        }
      } catch (err) {
        console.error('❌ Image moderation error:', err.message);
        // continue next image
      }
    }

    console.log('✅ Listing APPROVED.');
    return res.status(200).json({ verdict: 'SAFE' });

  } catch (error) {
    console.error('💥 Global moderation error:', error.message);
    // Fail‑open
    return res.status(200).json({ verdict: 'SAFE', reason: 'System bypass (error).' });
  }
}
