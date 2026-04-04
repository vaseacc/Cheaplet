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
        console.log("Description preview:", description?.substring(0, 100));

        // ---------- TEXT MODERATION (Groq) ----------
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        if (!GROQ_API_KEY) {
            console.error("GROQ_API_KEY missing");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Moderation system configuration error." }) };
        }

        let textVerdict = "SAFE";
        let textReason = "";
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
                            content: `You are a strict content moderator for a college student marketplace. 
                            Your job is to decide if a listing title and description are APPROPRIATE or INAPPROPRIATE.
                            Inappropriate content includes: nudity, sexual content, explicit language, hate speech, illegal items, drugs, weapons, spam, or anything not related to selling a legitimate student item (textbooks, electronics, furniture, school supplies).
                            Respond with ONLY "SAFE" or "UNSAFE". No extra text.`
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
            console.log("Groq response:", JSON.stringify(groqData, null, 2));

            if (groqData.choices && groqData.choices[0]?.message?.content) {
                const aiReply = groqData.choices[0].message.content.trim().toUpperCase();
                if (aiReply.includes("UNSAFE")) {
                    textVerdict = "UNSAFE";
                    textReason = "Text analysis flagged as inappropriate.";
                }
            } else {
                textVerdict = "UNSAFE";
                textReason = "Moderation service error.";
            }
        } catch (groqErr) {
            console.error("Groq error:", groqErr);
            textVerdict = "UNSAFE";
            textReason = "Moderation service temporarily unavailable.";
        }

        if (textVerdict === "UNSAFE") {
            console.log("Listing REJECTED due to text:", textReason);
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: textReason }) };
        }

        // ---------- IMAGE MODERATION (NSFW API) ----------
        const NSFW_API_URL = process.env.NSFW_API_URL;
        if (!NSFW_API_URL) {
            console.warn("NSFW_API_URL not set, skipping image moderation");
            // Fallback: approve if no image moderation configured
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };
        }

        if (imageUrls && imageUrls.length > 0) {
            for (const imageUrl of imageUrls) {
                try {
                    console.log("Checking image:", imageUrl);
                    const nsfwResponse = await fetch(`${NSFW_API_URL}/api/url_check?url=${encodeURIComponent(imageUrl)}`);
                    const nsfwData = await nsfwResponse.json();
                    console.log("NSFW API response:", JSON.stringify(nsfwData));

                    // The API returns { data: { is_nsfw: true/false } }
                    if (nsfwData.data && nsfwData.data.is_nsfw === true) {
                        console.log("Image rejected:", imageUrl);
                        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Image contains inappropriate content." }) };
                    }
                } catch (imgErr) {
                    console.error("Error checking image:", imageUrl, imgErr);
                    // If an image cannot be checked, reject to be safe
                    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Could not verify image safety." }) };
                }
            }
        }

        console.log("Listing APPROVED (text and image moderation passed).");
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };

    } catch (error) {
        console.error("Global Catch Error:", error);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "System error during moderation." }) };
    }
};
