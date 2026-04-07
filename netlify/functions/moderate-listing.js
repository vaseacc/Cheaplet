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

        // 1. GROQ TEXT MODERATION (Llama-3.3-70b)
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        
        if (GROQ_API_KEY) {
            // Personality instruction for common-sense moderation
            const prompt = `You are an intelligent marketplace moderator. Analyze the following text:
            Title: "${title}"
            Description: "${description}"
            
            YOUR TASK: Decide if this is SAFE or UNSAFE.
            
            RULES:
            - SAFE: Textbooks, novels, biographies (e.g. Elon Musk), school items, casual greetings ("hi", "test"), or empty text.
            - UNSAFE: Pornography, sexual services, illegal drugs, weapons, severe hate speech.
            
            Decision (answer ONLY with the word SAFE or UNSAFE):`;

            try {
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${GROQ_API_KEY}`, 
                        "Content-Type": "application/json" 
                    },
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
                    return { 
                        statusCode: 200, 
                        headers: corsHeaders, 
                        body: JSON.stringify({ verdict: "UNSAFE", reason: "Text content flagged as inappropriate." }) 
                    };
                }
            } catch (e) { 
                console.error("Groq Error:", e); 
                // Continue to image check if text check fails
            }
        }

        // 2. DOCKER NSFW IMAGE FILTER
        if (imageUrls && imageUrls.length > 0) {
            const NSFW_API_URL = process.env.NSFW_API_URL;
            
            if (NSFW_API_URL) {
                console.log("Checking image with Docker filter:", imageUrls[0]);
                try {
                    const imgRes = await fetch(`${NSFW_API_URL}?url=${encodeURIComponent(imageUrls[0])}`);
                    const imgData = await imgRes.json();
                    
                    console.log("NSFW API Result:", JSON.stringify(imgData));

                    // Logic based on your log format: data.is_nsfw
                    if (imgData.data?.is_nsfw === true || imgData.is_nsfw === true) {
                        return { 
                            statusCode: 200, 
                            headers: corsHeaders, 
                            body: JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged as inappropriate." }) 
                        };
                    }
                } catch (e) { 
                    console.error("NSFW API Error:", e);
                    // Fallback to safe on system error to avoid blocking good users
                }
            }
        }

        console.log("Post/Listing APPROVED.");
        return { 
            statusCode: 200, 
            headers: corsHeaders, 
            body: JSON.stringify({ verdict: "SAFE" }) 
        };

    } catch (error) {
        console.error("Global Moderation Error:", error);
        // Default to SAFE on total crash to prevent user frustration
        return { 
            statusCode: 200, 
            headers: corsHeaders, 
            body: JSON.stringify({ verdict: "SAFE", reason: "System bypass." }) 
        };
    }
};
