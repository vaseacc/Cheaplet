// moderate-listing.js - Waterfall Moderation: Keywords -> Groq Text -> Hugging Face Image -> Custom Docker Image

exports.handler = async (event, context) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    // Handle CORS preflight request
    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };

    try {
        const data = JSON.parse(event.body);
        let { imageUrls, title, description } = data;

        title = title || "";
        description = description || "";

        console.log("Moderation started for:", title);

        // ---------------------------------------------------------
        // 1. INSTANT LOCAL FILTER (Saves API costs/time)
        // ---------------------------------------------------------
        const forbiddenWords =["nude", "nudes", "porn", "sex", "escort", "hookup", "dick", "pussy", "onlyfans"];
        const fullText = `${title} ${description}`.toLowerCase();
        if (forbiddenWords.some(word => fullText.includes(word))) {
            console.log("Rejected: Forbidden word detected.");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Inappropriate language detected." }) };
        }

        // ---------------------------------------------------------
        // 2. TEXT MODERATION (Groq Llama 3.3)
        // ---------------------------------------------------------
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
                        messages:[
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
                        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Text flagged by AI moderation." }) };
                    }
                }
            } catch (groqErr) {
                console.error("Groq text error:", groqErr.message);
            }
        }

        // ---------------------------------------------------------
        // 3. IMAGE MODERATION WATERFALL (Hugging Face -> Docker)
        // ---------------------------------------------------------
        const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
        const NSFW_API_URL = process.env.NSFW_API_URL;

        if (imageUrls && imageUrls.length > 0) {
            for (const imageUrl of imageUrls) {
                let imageSuccessfullyProcessed = false;

                // === PLAN A: Hugging Face (Binary Upload) ===
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
                                    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged as inappropriate." }) };
                                }
                                imageSuccessfullyProcessed = true; // Prevent Plan B from running
                            } else {
                                console.warn("Hugging Face API returned status:", hfRes.status);
                            }
                        }
                    } catch (hfErr) {
                        console.warn("Hugging Face Plan A Failed:", hfErr.message);
                    }
                }

                // === PLAN B: Custom Docker API (NSFW_API_URL) ===
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
                                return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged as inappropriate by backup system." }) };
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
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };

    } catch (error) {
        console.error("Global Error:", error);
        // Fail-open: If our systems completely crash, we allow the post so the user isn't stuck.
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE", reason: "System bypass." }) };
    }
};
