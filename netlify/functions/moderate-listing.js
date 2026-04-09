// moderate-listing.js - Powered by Groq Vision for reliable NSFW blocking

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
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        console.log("Moderation started for:", title);

        // 1. INSTANT KEYWORD FILTER (The fastest layer)
        const forbiddenWords = ["nude", "nudes", "porn", "sex", "escort", "hookup", "naked"];
        const fullContent = (title + " " + description).toLowerCase();
        if (forbiddenWords.some(word => fullContent.includes(word))) {
            console.log("REJECTED: Inappropriate keywords.");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Inappropriate language detected." }) };
        }

        // 2. GROQ TEXT MODERATION
        if (GROQ_API_KEY) {
            try {
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [{ role: "user", content: `Analyze this marketplace listing: "${title} - ${description}". Is it pornographic, sexual, or a scam? Answer ONLY: SAFE or UNSAFE.` }],
                        temperature: 0.1, max_tokens: 5
                    })
                });
                const groqData = await groqRes.json();
                const textVerdict = groqData.choices[0].message.content.trim().toUpperCase();
                
                if (textVerdict.includes("UNSAFE")) {
                    console.log("REJECTED by Text AI.");
                    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Listing content flagged by safety system." }) };
                }
            } catch (e) { console.error("Groq Text Error:", e); }
        }

        // 3. GROQ VISION IMAGE MODERATION (Blocks Nudes)
        if (GROQ_API_KEY && imageUrls && imageUrls.length > 0) {
            console.log("Checking image with Groq Vision:", imageUrls[0]);
            
            try {
                const visionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama-3.2-11b-vision-preview",
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: "Does this image contain nudity, sexually explicit content, or exposed private parts? Answer ONLY: SAFE or UNSAFE." },
                                    { type: "image_url", image_url: { url: imageUrls[0] } }
                                ]
                            }
                        ],
                        temperature: 0.1,
                        max_tokens: 5
                    })
                });

                if (visionRes.ok) {
                    const visionData = await visionRes.json();
                    const visionVerdict = visionData.choices[0].message.content.trim().toUpperCase();
                    console.log("Vision verdict:", visionVerdict);

                    if (visionVerdict.includes("UNSAFE")) {
                        console.log("REJECTED by Vision AI.");
                        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged for inappropriate content." }) };
                    }
                } else {
                    console.warn("Groq Vision API failed, falling back to safe.");
                }
            } catch (e) { 
                console.error("Vision Processing Error:", e); 
            }
        }

        console.log("Post APPROVED.");
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };

    } catch (error) {
        console.error("Global Error:", error);
        // Fallback to safe to avoid blocking users on system errors
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };
    }
};
