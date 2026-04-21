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

  const data = await request.json();
  let { imageUrls, title, description } = data;
  title = title || "";
  description = description || "";

  // Local keyword filter
  const forbiddenWords = ["nude", "nudes", "porn", "sex", "escort", "hookup", "dick", "pussy", "onlyfans"];
  const fullText = `${title} ${description}`.toLowerCase();
  if (forbiddenWords.some(word => fullText.includes(word))) {
    return new Response(JSON.stringify({ verdict: "UNSAFE", reason: "Inappropriate language detected." }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Groq text moderation
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
            { role: "system", content: "You are a smart content moderator. APPROVE books/textbooks. REJECT only explicit content. Respond with ONLY 'SAFE' or 'UNSAFE'." },
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
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    } catch (err) {
      console.error("Groq error:", err.message);
    }
  }

  // Image moderation waterfall
  const HF_TOKEN = env.HUGGINGFACE_TOKEN;
  const NSFW_API_URL = env.NSFW_API_URL;
  if (imageUrls && imageUrls.length > 0) {
    for (const imageUrl of imageUrls) {
      let processed = false;
      if (HF_TOKEN && !processed) {
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
              if (nsfwItem && nsfwItem.score > 0.70) {
                return new Response(JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged as inappropriate." }), {
                  headers: { "Content-Type": "application/json" },
                });
              }
              processed = true;
            }
          }
        } catch (err) {
          console.warn("Hugging Face failed:", err.message);
        }
      }
      if (NSFW_API_URL && !processed) {
        try {
          const nsfwResponse = await fetch(`${NSFW_API_URL}/api/url_check?url=${encodeURIComponent(imageUrl)}`);
          if (nsfwResponse.ok) {
            const nsfwData = await nsfwResponse.json();
            if (nsfwData.data && nsfwData.data.is_nsfw === true) {
              return new Response(JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged by backup system." }), {
                headers: { "Content-Type": "application/json" },
              });
            }
          }
        } catch (err) {
          console.error("Docker API failed:", err.message);
        }
      }
    }
  }

  return new Response(JSON.stringify({ verdict: "SAFE" }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
