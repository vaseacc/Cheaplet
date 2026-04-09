// moderate-listing.js - High-Speed Groq + HuggingFace (Binary Mode)

exports.handler = async (event, context) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };

    try {
        const body = JSON.parse(event.body);
        let { imageUrls, title, description } = body;
        
        title = title || "";
        description = description || "";

        console.log("Moderation started for:", title);

        // 1. INSTANT KEYWORD FILTER
        const forbiddenWords = ["nude", "nudes", "porn", "sex", "escort", "hookup"];
        const fullContent = (title + " " + description).toLowerCase();
        if (forbiddenWords.some(word => fullContent.includes(word))) {
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Inappropriate language detected." }) };
        }

        // 2. GROQ TEXT MODERATION
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        if (GROQ_API_KEY) {
            try {
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [{ role: "user", content: `Analyze: "${title} - ${description}". SAFE or UNSAFE? Books/Biographies are SAFE. Answer ONLY: SAFE or UNSAFE.` }],
                        temperature: 0.1, max_tokens: 5
                    })
                });
                const groqData = await groqRes.json();
                const aiText = groqData.choices[0].message.content.trim().toUpperCase();
                console.log("Groq verdict:", aiText);

                if (aiText.includes("UNSAFE")) {
                    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Text flagged by AI." }) };
                }
            } catch (e) { console.error("Groq Error:", e); }
        }

        // 3. HUGGING FACE IMAGE MODERATION
        const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
        if (HF_TOKEN && imageUrls && imageUrls.length > 0) {
            console.log("Checking image with HuggingFace:", imageUrls[0]);
            
            try {
                const imageRes = await fetch(imageUrls[0]);
                if (!imageRes.ok) throw new Error("Could not download image from Cloudinary");
                const imageBuffer = await imageRes.arrayBuffer();

                // UPDATED URL: Added 'hf-inference/' prefix required by the new router
                const hfRes = await fetch(
                    "https://router.huggingface.co/hf-inference/models/falconsai/nsfw_image_detection",
                    {
                        headers: { 
                            Authorization: `Bearer ${HF_TOKEN}`,
                            "Content-Type": "application/octet-stream" 
                        },
                        method: "POST",
                        body: imageBuffer,
                    }
                );

                if (hfRes.ok) {
                    const hfData = await hfRes.json();
                    const nsfwItem = hfData.find(item => item.label === "nsfw");
                    const nsfwScore = nsfwItem ? nsfwItem.score : 0;

                    if (nsfwScore > 0.85) {
                        console.log("Image REJECTED by HF. Score:", nsfwScore);
                        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged as inappropriate." }) };
                    }
                    console.log("Image APPROVED. NSFW Score:", nsfwScore);
                } else {
                    const errorText = await hfRes.text();
                    console.warn(`Hugging Face API Error (${hfRes.status}):`, errorText);
                }
            } catch (e) { 
                console.error("Hugging Face Image Processing Error:", e); 
            }
        }

        console.log("Post APPROVED.");
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };

    } catch (error) {
        console.error("Global Error:", error);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE", reason: "Bypass" }) };
    }
};
