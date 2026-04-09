// moderate-listing.js - High-Speed Groq + HuggingFace (Binary Mode)

exports.handler = async (event, context) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    // Handle preflight requests for CORS
    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };

    try {
        const body = JSON.parse(event.body);
        let { imageUrls, title, description } = body;
        
        title = title || "";
        description = description || "";

        console.log("Moderation started for:", title);

        // 1. INSTANT KEYWORD FILTER
        const forbiddenWords =["nude", "nudes", "porn", "sex", "escort", "hookup"];
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
                        messages:[{ role: "user", content: `Analyze: "${title} - ${description}". SAFE or UNSAFE? Books/Biographies are SAFE. Answer ONLY: SAFE or UNSAFE.` }],
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

        // 3. HUGGING FACE IMAGE MODERATION (Updated Endpoint)
        const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
        if (HF_TOKEN && imageUrls && imageUrls.length > 0) {
            console.log("Checking image with HuggingFace:", imageUrls[0]);
            
            try {
                // A. Download the image from Cloudinary first
                const imageRes = await fetch(imageUrls[0]);
                if (!imageRes.ok) throw new Error("Could not download image from Cloudinary");
                const imageBuffer = await imageRes.arrayBuffer();

                // B. Send raw binary data to Hugging Face
                // Note: The URL was updated from api-inference to router.huggingface.co
                const hfRes = await fetch(
                    "https://router.huggingface.co/models/falconsai/nsfw_image_detection",
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
                    // hfData is an array:[{label: "nsfw", score: 0.99}, {label: "normal", score: 0.01}]
                    const nsfwItem = hfData.find(item => item.label === "nsfw");
                    const nsfwScore = nsfwItem ? nsfwItem.score : 0;

                    if (nsfwScore > 0.85) {
                        console.log("Image REJECTED by HF. Score:", nsfwScore);
                        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged as inappropriate." }) };
                    }
                    console.log("Image APPROVED. NSFW Score:", nsfwScore);
                } else {
                    const errorDetails = await hfRes.text();
                    console.warn("Hugging Face API error response:", errorDetails);
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
