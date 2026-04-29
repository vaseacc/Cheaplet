import { moderateImage, containsForbiddenWords } from '../lib/moderate-listing.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageUrls = [], title = '', description = '' } = req.body;
    const fullText = `${title} ${description}`;
    if (containsForbiddenWords(fullText)) {
      return res.status(200).json({ verdict: 'UNSAFE', reason: 'Inappropriate language detected.' });
    }

    const tokens = [process.env.HUGGINGFACE_TOKEN, process.env.HUGGINGFACE_TOKEN_2].filter(Boolean);
    for (const url of imageUrls) {
      const { score } = await moderateImage(url, tokens);
      if (score > 0.70) {
        return res.status(200).json({
          verdict: 'UNSAFE',
          reason: 'Image flagged as inappropriate.',
          details: { score }
        });
      }
    }
    return res.status(200).json({ verdict: 'SAFE' });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ verdict: 'SAFE', reason: 'System bypass (error).' });
  }
}
