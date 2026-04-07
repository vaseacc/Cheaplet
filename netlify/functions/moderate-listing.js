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

        // ... (your existing Groq code is here, but the prompt is failing)
====
const fetch = require('node-fetch');

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
        
        // Ensure strings are safe to parse
        title = title || "";
        description = description || "";

        console.log("Moderation started for:", title);
        console.log("Description preview:", description.substring(0, 100));

        // 1. HARD-CODED FILTER (Catch obvious bad stuff instantly)
        const forbiddenWords = ["nude", "nudes", "porn", "sex", "escort", "hookup"];
        const fullContent = (title + " " + description).toLowerCase();
        
        if (forbiddenWords.some(word => fullContent.includes(word))) {
            console.log("Listing REJECTED: Forbidden keyword detected.");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Inappropriate language detected in text." }) };
        }

        // 2. GROQ Llama-3.3 Text Moderation
        const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
        
        if (!GROQ_API_KEY) {
            console.error("Internal Error: GROQ_API_KEY is missing.");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Configuration error." }) };
        }

        const prompt = `You are a strict but fair content moderator for a college student marketplace. 
        Analyze the following listing:
        Title: "${title}"
        Description: "${description}"

        YOUR TASK: Decide if this text is SAFE or UNSAFE.

        RULES FOR "SAFE":
        - Normal book titles, school items, or casual messages.
        - VERY SHORT words like "test", "hi", "available", or even BLANK/EMPTY text are completely SAFE. Do not reject just because it is short.
        
        RULES FOR "UNSAFE":
        - Severe hate speech, racism, or illegal content.
        - Sexual acts, prostitution, or pornography.

        You must ONLY output the exact word "SAFE" or "UNSAFE". Do not output anything else.`;

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1, // Low temp for consistent answers
                max_tokens: 5
            })
        });

        if (!groqRes.ok) {
            throw new Error(`Groq API Error: ${groqRes.status}`);
        }

        const groqData = await groqRes.json();
        console.log("Groq response:", JSON.stringify(groqData, null, 2));

        const aiText = groqData.choices[0].message.content.trim().toUpperCase();

        if (aiText.includes("UNSAFE")) {
            console.log("Listing REJECTED due to text.");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Text analysis flagged as inappropriate." }) };
        }

        // 3. IMAGE MODERATION (Assuming you have an NSFW API configured)
        // If there are images, we check them. If not, it's already SAFE based on text.
        if (imageUrls && imageUrls.length > 0) {
            console.log("Checking image:", imageUrls[0]);
            
            // Allow 1.5s for Cloudinary to propagate the new image before scanning
            await new Promise(resolve => setTimeout(resolve, 1500));

            const picpurifyKey = process.env.VITE_PICPURIFY_API_KEY || process.env.PICPURIFY_API_KEY;
            
            if (picpurifyKey) {
                try {
                    const imgRes = await fetch(`https://www.picpurify.com/analyse/1.1?API_KEY=${picpurifyKey}&task=porn_moderation,gore_moderation,drug_moderation,weapon_moderation&url_image=${encodeURIComponent(imageUrls[0])}`);
                    const imgData = await imgRes.json();
                    console.log("PicPurify response:", JSON.stringify(imgData));

                    if (imgData.porn_moderation?.porn_content || imgData.gore_moderation?.gore_content || imgData.drug_moderation?.drug_content || imgData.weapon_moderation?.weapon_content) {
                        console.log("Listing REJECTED due to image.");
                        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Image flagged for inappropriate content." }) };
                    }
                } catch (imgErr) {
                    console.error("Image API Error:", imgErr);
                    // If image API fails, default to safe to not punish the user
                }
            } else {
                console.log("No PicPurify key found. Skipping advanced image check.");
            }
        }

        console.log("Listing APPROVED.");
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };

    } catch (error) {
        console.error("Global Catch Error:", error);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE", reason: "Fallback approval due to error." }) };
    }
};
