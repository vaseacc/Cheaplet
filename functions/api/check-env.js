export async function onRequestGet({ env }) {
  // Check if environment variables are set
  const hasHuggingFace = !!env.HUGGINGFACE_TOKEN || !!env.HUGGINGFACE_TOKEN_2;
  const hasGroq = !!env.GROQ_API_KEY;

  return new Response(JSON.stringify({
    huggingface: hasHuggingFace,
    groq: hasGroq,
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
