// moderate-listing.js - Reliable NSFW Detection via Base64 + Groq Vision

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

        // 1. KEYWORD FILTER (Fastest Layer)
        const forbidden = ["nude", "porn", "sex", "escort", "naked", "dick", "pussy"];
        if (forbidden.some(w => (title + " " + description).toLowerCase().includes(w))) {
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Inappropriate language." }) };
        }

        // 2. IMAGE MODERATION (Groq Vision via Base64)
        if (GROQ_API_KEY && imageUrls && imageUrls.length > 0) {
            try {
                console.log("Downloading image for analysis...");
                
                // Fetch the image and convert to Base64
                const imgResponse = await fetch(imageUrls[0]);
                if (!imgResponse.ok) throw new Error("Failed to fetch image from Cloudinary");
                
                const arrayBuffer = await imgResponse.arrayBuffer();
                const base64Image = Buffer.from(arrayBuffer).toString('base64');

                console.log("Sending Base64 to Groq Vision...");
                
                const visionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${GROQ_API_KEY}`, 
                        "Content-Type": "application/json" 
                    },
                    body: JSON.stringify({
                        model: "llama-3.2-11b-vision-preview",
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: "Is this image inappropriate for a school marketplace? Does it contain nudity, sexual content, or exposed body parts? Answer ONLY 'SAFE' or 'UNSAFE'." },
                                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                                ]
                            }
                        ],
                        temperature: 0.1,
                        max_tokens: 5
                    })
                });

                const visionData = await visionRes.json();
                const verdict = visionData.choices?.[0]?.message?.content?.trim().toUpperCase() || "SAFE";
                
                console.log("Vision AI Result:", verdict);

                if (verdict.includes("UNSAFE")) {
                    return { 
                        statusCode: 200, 
                        headers: corsHeaders, 
                        body: JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged for inappropriate content." }) 
                    };
                }

            } catch (visionErr) {
                console.error("Vision AI Error:", visionErr.message);
                // If Vision fails, we continue to text check
            }
        }

        // 3. TEXT MODERATION (Groq Llama 3.3)
        if (GROQ_API_KEY) {
            try {
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [{ role: "user", content: `Verdict for: "${title} - ${description}". SAFE or UNSAFE? (Sexual/Scam = UNSAFE). Answer only 1 word.` }],
                        temperature: 0.1, max_tokens: 5
                    })
                });
                const groqData = await groqRes.json();
                const textVerdict = groqData.choices[0].message.content.trim().toUpperCase();
                
                if (textVerdict.includes("UNSAFE")) {
                    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Text content flagged." }) };
                }
            } catch (e) { console.error("Text AI Error:", e); }
        }

        console.log("Listing APPROVED.");
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };

    } catch (error) {
        console.error("Critical System Error:", error);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };
    }
};
