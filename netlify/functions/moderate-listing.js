// moderate-listing.js - Optimized for Scoralia (Groq + HuggingFace)

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
            console.log("REJECTED: Forbidden keyword detected.");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Inappropriate language detected." }) };
        }

        // 2. GROQ TEXT MODERATION (Smart Logic for Elon Musk / Biographies)
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        if (GROQ_API_KEY) {
            const prompt = `You are a smart moderator. Analyze: Title: "${title}", Desc: "${description}". 
            Is it SAFE or UNSAFE (porn/drugs/slurs)? 
            ALLOW book titles, names like Elon Musk, and biographies. 
            Respond ONLY with: SAFE or UNSAFE.`;

            try {
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.1,
                        max_tokens: 5
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

        // 3. HUGGING FACE IMAGE MODERATION (High-Speed NSFW check)
        const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
        if (HF_TOKEN && imageUrls && imageUrls.length > 0) {
            console.log("Checking image with HuggingFace:", imageUrls[0]);
            
            try {
                const hfRes = await fetch(
                    "https://api-inference.huggingface.co/models/falconsai/nsfw_image_detection",
                    {
                        headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
                        method: "POST",
                        body: JSON.stringify({ inputs: imageUrls[0] }),
                    }
                );

                if (hfRes.ok) {
                    const hfData = await hfRes.json();
                    // hfData is an array: [{label: "nsfw", score: 0.99}, {label: "normal", score: 0.01}]
                    const nsfwItem = hfData.find(item => item.label === "nsfw");
                    const nsfwScore = nsfwItem ? nsfwItem.score : 0;

                    if (nsfwScore > 0.85) {
                        console.log("Image REJECTED by HF. Score:", nsfwScore);
                        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged as inappropriate." }) };
                    }
                    console.log("Image APPROVED by HF. NSFW Score:", nsfwScore);
                } else {
                    console.warn("Hugging Face API returned error:", hfRes.status);
                }
            } catch (e) { console.error("Hugging Face Connection Error:", e); }
        }

        console.log("Listing APPROVED.");
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };

    } catch (error) {
        console.error("Global Moderation Error:", error);
        // Fail-safe: approve if the moderation system itself crashes
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE", reason: "Bypass" }) };
    }
};
