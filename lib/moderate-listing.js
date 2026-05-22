export async function moderateImage(url, tokens, logCallback) {
  const logs = [];
  
  for (const token of tokens) {
    try {
      logs.push(`[HuggingFace] Fetching image from URL: ${url.substring(0, 60)}...`);
      const imgRes = await fetch(url);
      
      if (!imgRes.ok) {
        logs.push(`[HuggingFace] Failed to fetch image, status: ${imgRes.status}`);
        continue;
      }
      
      const buffer = await imgRes.arrayBuffer();
      logs.push(`[HuggingFace] Image fetched successfully, size: ${buffer.byteLength} bytes`);
      
      logs.push(`[HuggingFace] Sending to model: Falconsai/nsfw_image_detection`);
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
      
      logs.push(`[HuggingFace] API response status: ${hfRes.status} ${hfRes.statusText}`);
      
      if (hfRes.ok) {
        const data = await hfRes.json();
        logs.push(`[HuggingFace] Response data: ${JSON.stringify(data)}`);
        
        const score = data.find(item => item.label === 'nsfw')?.score ?? 0;
        logs.push(`[HuggingFace] NSFW score extracted: ${score}`);
        
        return { 
          score, 
          error: null,
          logs: [...logs, '[HuggingFace] Analysis complete']
        };
      } else if (hfRes.status === 503) {
        logs.push(`[HuggingFace] Model still loading (503), trying next token...`);
        continue; // model still loading – try next token
      } else {
        logs.push(`[HuggingFace] Unexpected status ${hfRes.status}, trying next token...`);
      }
      // other errors – try next token
    } catch (err) {
      logs.push(`[HuggingFace] Error with current token: ${err.message}`);
      continue; // network error – try next token
    }
  }
  
  logs.push('[HuggingFace] All tokens exhausted, returning default score');
  return { 
    score: 0, 
    error: 'All tokens exhausted',
    logs 
  };
}

export function containsForbiddenWords(text) {
  const words = [
    'nude', 'nudes', 'porn', 'sex', 'escort', 'hookup', 'dick', 'pussy', 'onlyfans'
  ];
  return words.some(w => text.toLowerCase().includes(w));
}
