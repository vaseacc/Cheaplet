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

        // 1. TEXT MODERATION USING GROQ (primary)
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        let textVerdict = "SAFE";
        let textReason = "";

        if (GROQ_API_KEY) {
            try {
                const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${GROQ_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile", // you can also use "mixtral-8x7b-32768" or "llama3-70b-8192"
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
                    } else if (aiReply.includes("SAFE")) {
                        textVerdict = "SAFE";
                    } else {
                        // Unclear response: assume unsafe to be safe
                        textVerdict = "UNSAFE";
                        textReason = "Unclear response from moderation AI.";
                    }
                } else {
                    console.warn("Groq returned unexpected format");
                    textVerdict = "UNSAFE";
                    textReason = "Moderation service error.";
                }
            } catch (groqErr) {
                console.error("Groq error:", groqErr);
                textVerdict = "UNSAFE";
                textReason = "Moderation service temporarily unavailable.";
            }
        } else {
            console.warn("GROQ_API_KEY not set, skipping text moderation");
        }

        // If text is unsafe, reject immediately
        if (textVerdict === "UNSAFE") {
            console.log("Listing REJECTED due to text:", textReason);
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: textReason }) };
        }

        // 2. IMAGE MODERATION (optional – if images are provided)
        // If you don't want image moderation, you can skip this part.
        // For now, we keep a simple keyword check on image URLs (optional)
        // You could also integrate a free image moderation API later.

        // If you want to reject listings that contain images with inappropriate filenames or no images at all, adjust here.
        // For now, we assume images are okay if text passed.

        console.log("Listing APPROVED (text moderation passed).");
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };

    } catch (error) {
        console.error("Global Catch Error:", error);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "System error during moderation." }) };
    }
};
