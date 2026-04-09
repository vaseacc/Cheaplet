// moderate-listing.js - Dedicated NSFW Detection via Hugging Face + Groq Text

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
        const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;

        console.log("Moderation started for:", title);

        // 1. KEYWORD FILTER (Fastest Layer)
        const forbidden =["nude", "nudes", "porn", "sex", "escort", "naked", "dick", "pussy", "onlyfans"];
        const fullContent = (title + " " + description).toLowerCase();
        if (forbidden.some(w => fullContent.includes(w))) {
            console.log("REJECTED: Inappropriate keywords.");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Inappropriate language." }) };
        }

        // 2. DEDICATED NSFW IMAGE DETECTION (Hugging Face)
        // NOTE: If you deploy your own Docker container, replace this URL with your custom Docker server URL!
        if (imageUrls && imageUrls.length > 0) {
            console.log("Downloading image for analysis:", imageUrls[0]);
            
            try {
                const imgResponse = await fetch(imageUrls[0]);
                if (!imgResponse.ok) throw new Error("Failed to fetch image from Cloudinary");
                const imageBuffer = await imgResponse.arrayBuffer();

                if (HF_TOKEN) {
                    console.log("Sending to Hugging Face NSFW Model...");
                    
                    // CRITICAL FIX: The model name is case-sensitive! "Falconsai", not "falconsai"
                    const hfRes = await fetch(
                        "https://router.huggingface.co/hf-inference/models/Falconsai/nsfw_image_detection",
                        {
                            headers: { 
                                "Authorization": `Bearer ${HF_TOKEN}`,
                                "Content-Type": "application/octet-stream" 
                            },
                            method: "POST",
                            body: imageBuffer,
                        }
                    );

                    if (hfRes.ok) {
                        const hfData = await hfRes.json();
                        console.log("Hugging Face Data:", JSON.stringify(hfData));
                        
                        // HF returns an array like[{label: "nsfw", score: 0.99}, {label: "normal", score: 0.01}]
                        const nsfwItem = hfData.find(item => item.label === "nsfw");
                        const nsfwScore = nsfwItem ? nsfwItem.score : 0;

                        // If the AI is more than 70% sure it's NSFW, block it.
                        if (nsfwScore > 0.70) {
                            console.log(`REJECTED by Hugging Face (Score: ${nsfwScore})`);
                            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged for inappropriate/NSFW content." }) };
                        }
                    } else {
                        const errText = await hfRes.text();
                        console.warn("Hugging Face API failed:", hfRes.status, errText);
                    }
                } else {
                    console.warn("No HUGGINGFACE_TOKEN found. Skipping image moderation.");
                }
            } catch (imgErr) {
                console.error("Image Processing Error:", imgErr.message);
            }
        }

        // 3. TEXT MODERATION (Groq Llama 3.3)
        if (GROQ_API_KEY) {
            try {
                console.log("Checking text with Groq...");
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages:[{ role: "user", content: `Analyze this marketplace listing: "${title} - ${description}". Is it offering sexual services, porn, or scams? Answer ONLY 'SAFE' or 'UNSAFE'.` }],
                        temperature: 0.1, max_tokens: 5
                    })
                });
                const groqData = await groqRes.json();
                const textVerdict = groqData.choices?.[0]?.message?.content?.trim().toUpperCase() || "SAFE";
                
                if (textVerdict.includes("UNSAFE")) {
                    console.log("REJECTED by Groq Text AI.");
                    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Text content flagged as inappropriate." }) };
                }
            } catch (e) { console.error("Text AI Error:", e.message); }
        }

        console.log("Listing APPROVED.");
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };

    } catch (error) {
        console.error("Critical System Error:", error);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };
    }
};
