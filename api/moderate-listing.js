export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    let { imageUrls, title, description } = data;
    title = title || "";
    description = description || "";

    console.log("Moderation started for:", title);

    // 1. Local keyword filter
    const forbiddenWords = ["nude", "nudes", "porn", "sex", "escort", "hookup", "dick", "pussy", "onlyfans"];
    const fullText = `${title} ${description}`.toLowerCase();
    if (forbiddenWords.some(word => fullText.includes(word))) {
      console.log("Rejected: Forbidden word detected.");
      return res.status(200).json({ verdict: "UNSAFE", reason: "Inappropriate language detected." });
    }

    // 2. Text moderation with Groq
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
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
            return res.status(200).json({ verdict: "UNSAFE", reason: "Text flagged by AI moderation." });
          }
        }
      } catch (groqErr) {
        console.error("Groq text error:", groqErr.message);
      }
    }

    // 3. Image moderation waterfall
    const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
    const NSFW_API_URL = process.env.NSFW_API_URL;

    if (imageUrls && imageUrls.length > 0) {
      for (const imageUrl of imageUrls) {
        let imageSuccessfullyProcessed = false;

        // Plan A: Hugging Face
        if (HF_TOKEN && !imageSuccessfullyProcessed) {
          try {
            console.log("Downloading image for Hugging Face...");
            const imgRes = await fetch(imageUrl);
            
            if (imgRes.ok) {
              const imgBuffer = await imgRes.arrayBuffer();
              console.log("Sending to Hugging Face Falconsai...");
              
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
                
                console.log("Hugging Face NSFW Score:", score);

                if (score > 0.70) {
                  console.log("Image rejected by Hugging Face.");
                  return res.status(200).json({ verdict: "UNSAFE", reason: "Image flagged as inappropriate." });
                }
                imageSuccessfullyProcessed = true;
              } else {
                console.warn("Hugging Face API returned status:", hfRes.status);
              }
            }
          } catch (hfErr) {
            console.warn("Hugging Face Plan A Failed:", hfErr.message);
          }
        }

        // Plan B: Custom Docker API
        if (NSFW_API_URL && !imageSuccessfullyProcessed) {
          try {
            console.log("Hugging Face bypassed/failed. Attempting Plan B (Docker URL Check)...");
            const nsfwResponse = await fetch(`${NSFW_API_URL}/api/url_check?url=${encodeURIComponent(imageUrl)}`);
            
            const contentType = nsfwResponse.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const nsfwData = await nsfwResponse.json();
              console.log("Docker API Result:", JSON.stringify(nsfwData));

              if (nsfwData.data && nsfwData.data.is_nsfw === true) {
                console.log("Image rejected by Backup Docker API.");
                return res.status(200).json({ verdict: "UNSAFE", reason: "Image flagged as inappropriate by backup system." });
              }
              imageSuccessfullyProcessed = true;
            } else {
              console.warn("Docker API did not return JSON. Status:", nsfwResponse.status);
            }
          } catch (imgErr) {
            console.error("Docker Plan B Check failed:", imgErr.message);
          }
        }
      }
    }

    console.log("Listing APPROVED.");
    return res.status(200).json({ verdict: "SAFE" });

  } catch (error) {
    console.error("Global Error:", error);
    // Fail-open: allow post if system crashes
    return res.status(200).json({ verdict: "SAFE", reason: "System bypass." });
  }
}
