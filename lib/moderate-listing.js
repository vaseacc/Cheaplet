export async function moderateImage(url, tokens) {
  for (const token of tokens) {
    try {
      const imgRes = await fetch(url);
      if (!imgRes.ok) continue;
      const buffer = await imgRes.arrayBuffer();

      const hfRes = await fetch(
        'https://router.huggingface.co/hf-inference/models/Falconsai/nsfw_image_detection',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream'
          },
          body: buffer
        }
      );

      if (hfRes.ok) {
        const data = await hfRes.json();
        const score = data.find(item => item.label === 'nsfw')?.score ?? 0;
        return { score, error: null };
      } else if (hfRes.status === 503) {
        continue; // model still loading – try next token
      }
      // other errors – try next token
    } catch (err) {
      continue; // network error – try next token
    }
  }
  return { score: 0, error: 'All tokens exhausted' };
}

export function containsForbiddenWords(text) {
  const words = [
    'nude', 'nudes', 'porn', 'sex', 'escort', 'hookup', 'dick', 'pussy', 'onlyfans'
  ];
  return words.some(w => text.toLowerCase().includes(w));
}
