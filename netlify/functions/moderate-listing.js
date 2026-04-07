const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent";

exports.handler = async (event, context) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };

    try {
        const data = JSON.parse(event.body);
        const { imageUrls, title, description } = data;

        // --- BACKUP HARD-CODED FILTER ---
        const forbiddenWords =["nude", "nudes", "porn", "sex", "escort", "hookup"];
        const fullContent = ((title || "") + " " + (description || "")).toLowerCase();
        
        if (forbiddenWords.some(word => fullContent.includes(word))) {
            console.log("REJECTED: Forbidden keyword detected.");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Inappropriate language detected in description." }) };
        }

        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) throw new Error("Missing API Key");

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Download first 2 images
        const imageDataArray =[];
        if (imageUrls && imageUrls.length > 0) {
            for (const url of imageUrls.slice(0, 2)) {
                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const buffer = await res.arrayBuffer();
                        imageDataArray.push({ base64: Buffer.from(buffer).toString('base64') });
                    }
                } catch (e) { console.error("Image fetch error", e); }
            }
        }

        const prompt = `You are a strict safety moderator for a college student network and marketplace. 
        Analyze the image and text: "${title} - ${description}".
        
        CRITICAL RULES - ZERO TOLERANCE FOR NSFW:
        - REJECT IMMEDIATELY if the image contains ANY nudity, partial nudity, pornography, lingerie, underwear, or suggestive posing.
        - REJECT IMMEDIATELY if the image shows illegal drugs, weapons, or graphic violence.
        
        RULES FOR APPROVAL:
        - Normal conversations, greetings ("hi", "test"), questions, or completely BLANK text are perfectly SAFE. Do not reject just because the text is short.
        - APPROVE if it is a physical item (book, electronics, etc). 
        - ALLOW book covers with human faces (e.g., Elon Musk biography).
        
        JSON OUTPUT ONLY.`;

        const contentParts = [{ text: prompt }];
        if (imageDataArray.length > 0) {
            contentParts.push({ inlineData: { mimeType: "image/jpeg", data: imageDataArray[0].base64 } });
        }

        const aiRes = await fetch(`${GEMINI_API_URL}?key=${GEMINI_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: contentParts }],
                generationConfig: { 
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            verdict: { type: "STRING", enum: ["SAFE", "UNSAFE"] },
                            reason: { type: "STRING" }
                        },
                        required: ["verdict"]
                    }
                }
            })
        });

        const aiData = await aiRes.json();
        
        if (aiData.candidates && aiData.candidates[0]?.content?.parts?.[0]?.text) {
            const result = JSON.parse(aiData.candidates[0].content.parts[0].text);
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(result) };
        }

        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Safety check failed." }) };

    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "System Error" }) };
    }
};
