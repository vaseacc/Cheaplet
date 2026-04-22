export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const uploadPreset = env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const cloudName = env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = env.VITE_CLOUDINARY_API_KEY;
  const apiSecret = env.VITE_CLOUDINARY_API_SECRET;

  // Build the signature string exactly as Cloudinary expects
  const signatureString = `timestamp=${timestamp}&upload_preset=${uploadPreset}${apiSecret}`;
  
  // Generate SHA-1 hash using Web Crypto API (built into Cloudflare Workers)
  const encoder = new TextEncoder();
  const data = encoder.encode(signatureString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return new Response(JSON.stringify({
    signature,
    timestamp,
    apiKey,
    cloudName,
    uploadPreset
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
