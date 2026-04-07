exports.handler = async (event, context) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };

    try {
        const data = JSON.parse(event.body);
        let { imageUrls, title, description } = data;
        
        title = title || "";
        description = description || "";

        console.log("Moderation started for:", title);

        // 1. GROQ TEXT MODERATION (Llama-3.3-70b)
        const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
        
        if (GROQ_API_KEY) {
            const prompt = `Moderator mode: Analyze "${title} - ${description}". 
            Is it SAFE or UNSAFE (porn/drugs/slurs)? 
            Short text like "hi" or "test" or blank text is SAFE. 
            ONLY answer SAFE or UNSAFE.`;

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
                
                if (aiText.includes("UNSAFE")) {
                    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Text flagged by AI." }) };
                }
            } catch (e) { console.error("Groq Error:", e); }
        }

        // 2. DOCKER / REMOTE NSFW IMAGE FILTER
        if (imageUrls && imageUrls.length > 0) {
            // This is the URL of your Docker server or NSFW API
            const NSFW_API_URL = process.env.VITE_NSFW_API_URL || process.env.NSFW_API_URL;
            
            if (NSFW_API_URL) {
                console.log("Checking image with Docker NSFW filter:", imageUrls[0]);
                try {
                    const imgRes = await fetch(`${NSFW_API_URL}?url=${encodeURIComponent(imageUrls[0])}`);
                    const imgData = await imgRes.json();
                    
                    // Logic based on the logs you showed me (Sightengine/Docker format)
                    if (imgData.data?.is_nsfw === true || imgData.is_nsfw === true) {
                        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged as inappropriate." }) };
                    }
                } catch (e) { 
                    console.error("NSFW Docker Error:", e);
                    // Fallback to safe if your Docker server is down so users can still post
                }
            }
        }

        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };

    } catch (error) {
        console.error("Global Moderation Error:", error);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE", reason: "Error fallback." }) };
    }
};
