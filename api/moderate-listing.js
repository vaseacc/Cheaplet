// functions/api/moderate-listing.js
export default {
  async onRequest({ request, env, ctx }) {
    // CORS
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }

    try {
      const data = await request.json();
      let { imageUrls, title, description } = data;
      title = title || "";
      description = description || "";

      console.log("Moderation started for:", title);

      // 1. Local keyword filter
      const forbiddenWords = ["nude", "nudes", "porn", "sex", "escort", "hookup", "dick", "pussy", "onlyfans"];
      const fullText = `${title} ${description}`.toLowerCase();
      if (forbiddenWords.some(word => fullText.includes(word))) {
        console.log("Rejected: Forbidden word detected.");
        return new Response(JSON.stringify({ verdict: "UNSAFE", reason: "Inappropriate language detected." }), { headers });
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
                {
                  role: "user",
                  content: `Title: "${title}"\nDescription: "${description}"`
                }
              ],
              temperature: 0,
              max_tokens: 10
            })
          });

          if (groqResponse.ok) {
            const groqData = await groqResponse.json();
            const aiReply = groqData.choices?.[0]?.message?.content?.trim().toUpperCase() || "";
            console.log("Groq Text Result:", aiReply);
            
            if (aiReply.includes("UNSAFE")) {
              console.log("Rejected by Text AI.");
              return new Response(JSON.stringify({ verdict: "UNSAFE", reason: "Text flagged by AI moderation." }), { headers });
            }
          }
        } catch (groqErr) {
          console.error("Groq text error:", groqErr.message);
        }
      }

      // 3. Image moderation waterfall with multi‑token fallback
      // -----------------------------------------------------------
      // Hugging Face tokens – will try env.HUGGINGFACE_TOKEN first, then env.HUGGINGFACE_TOKEN_2
      const hfTokens = [];
      if (env.HUGGINGFACE_TOKEN) hfTokens.push(env.HUGGINGFACE_TOKEN);
      if (env.HUGGINGFACE_TOKEN_2) hfTokens.push(env.HUGGINGFACE_TOKEN_2);
      // You can add HUGGINGFACE_TOKEN_3 etc. in the same way

      const NSFW_API_URL = env.NSFW_API_URL; // your custom Docker API fallback

      if (imageUrls && imageUrls.length > 0) {
        for (const imageUrl of imageUrls) {
          let imageSuccessfullyProcessed = false;

          // Plan A: Hugging Face – try each token until one works
          if (hfTokens.length > 0 && !imageSuccessfullyProcessed) {
            for (const token of hfTokens) {
              try {
                console.log(`Attempting Hugging Face with token starting ${token.substring(0, 4)}...`);
                
                const imgRes = await fetch(imageUrl);
                if (!imgRes.ok) throw new Error(`Failed to download image (status ${imgRes.status})`);

                const imgBuffer = await imgRes.arrayBuffer();

                const hfRes = await fetch(
                  "https://router.huggingface.co/hf-inference/models/Falconsai/nsfw_image_detection",
                  {
                    method: "POST",
                    headers: { 
                      "Authorization": `Bearer ${token}`, 
                      "Content-Type": "application/octet-stream" 
                    },
                    body: imgBuffer
                  }
                );

                if (hfRes.ok) {
                  const hfData = await hfRes.json();
                  const nsfwItem = hfData.find(item => item.label === "nsfw");
                  const score = nsfwItem ? nsfwItem.score : 0;
                  console.log(`Hugging Face NSFW Score: ${score} (token ${token.substring(0, 4)}...)`);

                  if (score > 0.70) {
                    console.log("Image rejected by Hugging Face.");
                    return new Response(JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged as inappropriate." }), { headers });
                  }
                  imageSuccessfullyProcessed = true;
                  break; // token succeeded, no need to try others
                } else {
                  console.warn(`Hugging Face returned status ${hfRes.status} with token ${token.substring(0, 4)}...`);
                }
              } catch (hfErr) {
                console.warn(`Hugging Face attempt failed with token ${token.substring(0, 4)}...: ${hfErr.message}`);
              }
            }
            if (!imageSuccessfullyProcessed && hfTokens.length > 0) {
              console.warn("All Hugging Face tokens exhausted. Falling back to Docker API.");
            }
          }

          // Plan B: Custom Docker API
          if (NSFW_API_URL && !imageSuccessfullyProcessed) {
            try {
              console.log("Attempting Plan B (Docker URL Check)...");
              const nsfwResponse = await fetch(`${NSFW_API_URL}/api/url_check?url=${encodeURIComponent(imageUrl)}`);
              
              const contentType = nsfwResponse.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                const nsfwData = await nsfwResponse.json();
                console.log("Docker API Result:", JSON.stringify(nsfwData));

                if (nsfwData.data && nsfwData.data.is_nsfw === true) {
                  console.log("Image rejected by Backup Docker API.");
                  return new Response(JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged as inappropriate by backup system." }), { headers });
                }
                imageSuccessfullyProcessed = true;
              } else {
                console.warn("Docker API did not return JSON. Status:", nsfwResponse.status);
              }
            } catch (imgErr) {
              console.error("Docker Plan B Check failed:", imgErr.message);
            }
          }

          // If image wasn't processed by any system, assume safe (fail‑open)
          if (!imageSuccessfullyProcessed) {
            console.warn("Image could not be moderated – assuming safe (fail‑open)");
          }
        }
      }

      console.log("Listing APPROVED.");
      return new Response(JSON.stringify({ verdict: "SAFE" }), { headers });

    } catch (error) {
      console.error("Global Error:", error);
      // Fail‑open: allow post if system crashes
      return new Response(JSON.stringify({ verdict: "SAFE", reason: "System bypass." }), { headers });
    }
  }
};
