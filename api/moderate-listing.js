// api/moderate-listing.js – Vercel version (works on Vercel, ready for Cloudflare too)
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageUrls = [], title = '', description = '' } = req.body;
    console.log('🔍 Moderation started:', title || '(no title)');

    // 1. Local keyword filter
    const forbiddenWords = ['nude', 'nudes', 'porn', 'sex', 'escort', 'hookup', 'dick', 'pussy', 'onlyfans'];
    const fullText = `${title} ${description}`.toLowerCase();
    if (forbiddenWords.some(w => fullText.includes(w))) {
      return res.status(200).json({ verdict: 'UNSAFE', reason: 'Inappropriate language detected.' });
    }

    // 2. Hugging Face NSFW detection with AUTOMATIC TOKEN FALLBACK
    // Collect all tokens. You can add HUGGINGFACE_TOKEN_3, _4, etc. later.
    const hfTokens = [
      process.env.HUGGINGFACE_TOKEN,
      process.env.HUGGINGFACE_TOKEN_2
    ].filter(Boolean);   // remove undefined / empty strings

    if (hfTokens.length === 0) {
      console.warn('⚠️ No Hugging Face tokens found – skipping image moderation.');
      return res.status(200).json({ verdict: 'SAFE', details: 'No token' });
    }

    for (const imageUrl of imageUrls) {
      let imageProcessed = false;

      // Try each token until one succeeds
      for (const token of hfTokens) {
        try {
          const imgRes = await fetch(imageUrl);
          if (!imgRes.ok) {
            console.warn(`⚠️ Could not download image (status ${imgRes.status}), skipping.`);
            break; // cannot process this image at all
          }

          const arrayBuffer = await imgRes.arrayBuffer();
          const imgBuffer = Buffer.from(arrayBuffer);

          const hfRes = await fetch(
            'https://router.huggingface.co/hf-inference/models/Falconsai/nsfw_image_detection',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/octet-stream'
              },
              body: imgBuffer
            }
          );

          if (hfRes.ok) {
            const hfData = await hfRes.json();
            const nsfwItem = hfData.find(item => item.label === 'nsfw');
            const score = nsfwItem ? nsfwItem.score : 0;
            console.log(`📊 NSFW score (token ${token.substring(0,4)}…): ${score}`);

            if (score > 0.70) {
              return res.status(200).json({
                verdict: 'UNSAFE',
                reason: 'Image flagged as inappropriate.',
                details: { score }
              });
            }
            imageProcessed = true;
            break;          // token succeeded, move to next image
          } else {
            const errText = await hfRes.text();
            console.warn(`❌ Hugging Face API error (status ${hfRes.status}) with token ${token.substring(0,4)}…:`, errText);
            if (hfRes.status === 503) {
              // Model loading – skip this token, try next one
              continue;
            }
            // Other errors (401, 429) – token invalid or exhausted, try next token
            continue;
          }
        } catch (err) {
          console.warn(`❌ Token ${token.substring(0,4)}… failed:`, err.message);
          // Try next token
        }
      } // end token loop

      if (!imageProcessed) {
        console.warn(`⚠️ Could not moderate image ${imageUrl} with any token – assuming safe.`);
        // fail‑open: continue to next image
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
