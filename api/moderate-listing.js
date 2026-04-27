// functions/api/moderate-listing.js
export default {
  async onRequest({ request, env }) {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }

    try {
      const data = await request.json();
      const { imageUrls = [], title = '', description = '' } = data;

      console.log('🔍 Moderation started:', title || '(no title)');

      // ---- 1. Local keyword filter ----
      const forbiddenWords = ['nude', 'nudes', 'porn', 'sex', 'escort', 'hookup', 'dick', 'pussy', 'onlyfans'];
      const fullText = `${title} ${description}`.toLowerCase();
      if (forbiddenWords.some(w => fullText.includes(w))) {
        return new Response(JSON.stringify({ verdict: 'UNSAFE', reason: 'Inappropriate language detected.' }), { headers });
      }

      // ---- 2. Hugging Face NSFW image detection (only uses HUGGINGFACE_TOKEN env var) ----
      const HF_TOKEN = env.HUGGINGFACE_TOKEN;

      if (!HF_TOKEN) {
        console.warn('⚠️ HUGGINGFACE_TOKEN not set – skipping image moderation.');
        return new Response(JSON.stringify({ verdict: 'SAFE', details: 'No token' }), { headers });
      }

      for (const imageUrl of imageUrls) {
        try {
          // Download image
          const imgRes = await fetch(imageUrl);
          if (!imgRes.ok) {
            console.warn(`⚠️ Could not download image (status ${imgRes.status}), skipping.`);
            continue;
          }

          const imgBuffer = await imgRes.arrayBuffer();

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
            // If model is loading (503), skip this image
            if (hfRes.status === 503) continue;
            // Otherwise skip too (fail‑safe)
            continue;
          }

          const hfData = await hfRes.json();
          const nsfwItem = hfData.find(item => item.label === 'nsfw');
          const score = nsfwItem ? nsfwItem.score : 0;

          console.log(`📊 NSFW score: ${score}`);

          if (score > 0.70) {
            return new Response(JSON.stringify({
              verdict: 'UNSAFE',
              reason: 'Image flagged as inappropriate.',
              details: { score }
            }), { headers });
          }
        } catch (err) {
          console.error('❌ Image moderation error:', err.message);
          // Continue to next image
        }
      }

      console.log('✅ Listing APPROVED.');
      return new Response(JSON.stringify({ verdict: 'SAFE' }), { headers });

    } catch (error) {
      console.error('💥 Global moderation error:', error.message);
      // Fail‑open: allow the post if the system crashes
      return new Response(JSON.stringify({ verdict: 'SAFE', reason: 'System bypass (error).' }), { headers });
    }
  }
};
