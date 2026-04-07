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

        console.log("Moderation started for:", title);

        // 1. INSTANT LOCAL FILTER (Saves API costs/time)
        const forbiddenWords = ["nude", "nudes", "porn", "sex", "escort", "hookup"];
        const fullText = `${title} ${description}`.toLowerCase();
        if (forbiddenWords.some(word => fullText.includes(word))) {
            console.log("Rejected: Forbidden word detected.");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Inappropriate language detected." }) };
        }

        // 2. TEXT MODERATION (Groq)
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        if (!GROQ_API_KEY) {
            console.error("GROQ_API_KEY missing");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Moderation config error." }) };
        }

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
                            content: `Title: "${title || ''}"\nDescription: "${description || ''}"`
                        }
                    ],
                    temperature: 0,
                    max_tokens: 10
                })
            });

            const groqData = await groqResponse.json();
            const aiReply = groqData.choices?.[0]?.message?.content?.trim().toUpperCase() || "";
            
            if (aiReply.includes("UNSAFE")) {
                console.log("Rejected by Text AI.");
                return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Text flagged by AI moderation." }) };
            }
        } catch (groqErr) {
            console.error("Groq error:", groqErr);
            // Fallback: Continue if text AI fails
        }

        // 3. IMAGE MODERATION (Docker NSFW API)
        const NSFW_API_URL = process.env.NSFW_API_URL;
        if (NSFW_API_URL && imageUrls && imageUrls.length > 0) {
            for (const imageUrl of imageUrls) {
                try {
                    // This matches your specific Docker API path
                    const nsfwResponse = await fetch(`${NSFW_API_URL}/api/url_check?url=${encodeURIComponent(imageUrl)}`);
                    
                    const contentType = nsfwResponse.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const nsfwData = await nsfwResponse.json();
                        console.log("NSFW API Result:", JSON.stringify(nsfwData));

                        if (nsfwData.data && nsfwData.data.is_nsfw === true) {
                            console.log("Image rejected by Docker.");
                            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged as inappropriate." }) };
                        }
                    }
                } catch (imgErr) {
                    console.error("Image check failed:", imgErr);
                }
            }
        }

        console.log("Listing APPROVED.");
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };

    } catch (error) {
        console.error("Global Error:", error);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE", reason: "System bypass." }) };
    }
};
