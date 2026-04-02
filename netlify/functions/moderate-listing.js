exports.handler = async (event, context) => {
    // 1. CORS Headers
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };

    try {
        const data = JSON.parse(event.body);
        let { imageUrls, title, description } = data;

        if (!imageUrls || imageUrls.length === 0) {
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Listings must include at least one valid image." }) };
        }

        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;

        // --- Step 2: Download images in Parallel ---
        const imagesToScan = imageUrls.slice(0, 3); 
        const imagePromises = imagesToScan.map(async (imgUrl) => {
            try {
                const imgRes = await fetch(imgUrl);
                if (!imgRes.ok) return null;
                const buffer = await imgRes.arrayBuffer();
                return { base64: Buffer.from(buffer).toString('base64') };
            } catch (err) {
                return null; 
            }
        });

        const imageDataArray = (await Promise.all(imagePromises)).filter(img => img !== null);

        if (imageDataArray.length === 0) {
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Failed to process the uploaded images." }) };
        }

        // --- Step 3: ULTRA-STRICT AI PROMPT ---
        const prompt = `You are a ruthless, zero-tolerance safety AI for a college student marketplace. 
        Analyze the image(s) AND the text provided below.

        LISTING TITLE: "${title}"
        LISTING DESCRIPTION: "${description}"

        CRITICAL REJECTION RULES (MARK UNSAFE IMMEDIATELY IF ANY ARE TRUE):
        1. PORNOGRAPHY & NUDITY: Any nudity, sexual poses, lingerie, swimwear, hentai, or sexually explicit text/titles (e.g. the word "porn").
        2. SPAM & IRRELEVANCE: If the image is a random landscape, nature photo, meme, screenshot of text, pitch-black image, blurry mess, or clearly NOT a product being sold.
        3. DANGEROUS ITEMS: Weapons, drugs, vaping, alcohol.
        4. INAPPROPRIATE TEXT: If the title or description contains profanity, sexual words, or slurs.

        APPROVAL RULES:
        - Mark SAFE ONLY if the image clearly shows a legitimate physical item for sale (e.g., textbook, laptop, calculator, desk, jacket) AND the text is appropriate.

        OUTPUT EXACTLY THIS RAW JSON FORMAT AND NOTHING ELSE:
        {"verdict": "SAFE", "reason": "Valid item."}
        or
        {"verdict": "UNSAFE", "reason": "Detailed explanation of what rule was broken"}
        `;

        // --- Step 4: Ask Gemini 2.0 Flash (Smarter Model) ---
        let isUnsafe = false;
        let finalReason = "";

        const aiPromises = imageDataArray.map(async (img) => {
            const aiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: img.base64 } }] }]
                    })
                }
            );
            return aiRes.json();
        });

        const aiResults = await Promise.all(aiPromises);

        for (const aiData of aiResults) {
            // Check Google's hard filters
            if (aiData.candidates && aiData.candidates[0]?.finishReason === "SAFETY") {
                isUnsafe = true;
                finalReason = "Google internal safety filters blocked the explicit content.";
                break;
            }

            if (aiData.candidates && aiData.candidates[0]?.content?.parts?.[0]?.text) {
                let aiText = aiData.candidates[0].content.parts[0].text;
                aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();

                try {
                    const result = JSON.parse(aiText);
                    if (result.verdict === "UNSAFE") {
                        isUnsafe = true;
                        finalReason = result.reason;
                        break; 
                    }
                } catch (e) {
                    if (aiText.toUpperCase().includes("UNSAFE")) {
                        isUnsafe = true;
                        finalReason = "AI flagged as unsafe.";
                        break;
                    }
                }
            }
        }

        // --- Step 5: Return Verdict to Frontend ---
        if (isUnsafe) {
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: finalReason }) };
        } else {
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };
        }

    } catch (error) {
        console.error("Moderation error:", error);
        return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: "Internal server error" }) };
    }
};
