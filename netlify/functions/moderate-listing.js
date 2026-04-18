// Cloudflare Pages Function: /functions/moderate-listing.js
export async function onRequest(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const env = context.env;
  const data = await context.request.json();
  let { imageUrls, title, description } = data;
  title = title || "";
  description = description || "";

  // 1. Local keyword filter
  const forbiddenWords = ["nude", "nudes", "porn", "sex", "escort", "hookup", "dick", "pussy", "onlyfans"];
  const fullText = `${title} ${description}`.toLowerCase();
  if (forbiddenWords.some(word => fullText.includes(word))) {
    return new Response(JSON.stringify({ verdict: "UNSAFE", reason: "Inappropriate language detected." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // 2. Text moderation with Groq
  const GROQ_API_KEY = env.GROQ_API_KEY;
  if (GROQ_API_KEY) {
    try {
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are a smart content moderator for a student marketplace. 
              - APPROVE (SAFE) if it is a book, textbook, or biography (even if the title is a person's name like Elon Musk).
              - APPROVE (SAFE) casual greetings, short tests, or empty text.
              - REJECT (UNSAFE) only for: Nudity, sexual services, drugs, weapons, or hate speech.
              Respond with ONLY "SAFE" or "UNSAFE".`
            },
            { role: "user", content: `Title: "${title}"\nDescription: "${description}"` }
          ],
          temperature: 0,
          max_tokens: 10
        })
      });

      if (groqResponse.ok) {
        const groqData = await groqResponse.json();
        const aiReply = groqData.choices?.[0]?.message?.content?.trim().toUpperCase() || "";
        if (aiReply.includes("UNSAFE")) {
          return new Response(JSON.stringify({ verdict: "UNSAFE", reason: "Text flagged by AI moderation." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
    } catch (err) {
      console.error("Groq text error:", err.message);
    }
  }

  // 3. Image moderation waterfall (Hugging Face -> Docker)
  const HF_TOKEN = env.HUGGINGFACE_TOKEN;
  const NSFW_API_URL = env.NSFW_API_URL;

  if (imageUrls && imageUrls.length > 0) {
    for (const imageUrl of imageUrls) {
      let imageSuccessfullyProcessed = false;

      // Plan A: Hugging Face
      if (HF_TOKEN && !imageSuccessfullyProcessed) {
        try {
          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            const imgBuffer = await imgRes.arrayBuffer();
            const hfRes = await fetch(
              "https://router.huggingface.co/hf-inference/models/Falconsai/nsfw_image_detection",
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${HF_TOKEN}`,
                  "Content-Type": "application/octet-stream"
                },
                body: imgBuffer
              }
            );
            if (hfRes.ok) {
              const hfData = await hfRes.json();
              const nsfwItem = hfData.find(item => item.label === "nsfw");
              const score = nsfwItem ? nsfwItem.score : 0;
              if (score > 0.70) {
                return new Response(JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged as inappropriate." }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
              }
              imageSuccessfullyProcessed = true;
            }
          }
        } catch (err) {
          console.warn("Hugging Face Plan A Failed:", err.message);
        }
      }

      // Plan B: Docker API
      if (NSFW_API_URL && !imageSuccessfullyProcessed) {
        try {
          const nsfwResponse = await fetch(`${NSFW_API_URL}/api/url_check?url=${encodeURIComponent(imageUrl)}`);
          const contentType = nsfwResponse.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const nsfwData = await nsfwResponse.json();
            if (nsfwData.data && nsfwData.data.is_nsfw === true) {
              return new Response(JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged as inappropriate by backup system." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
            imageSuccessfullyProcessed = true;
          }
        } catch (err) {
          console.error("Docker Plan B Check failed:", err.message);
        }
      }
    }
  }

  // Safe
  return new Response(JSON.stringify({ verdict: "SAFE" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
