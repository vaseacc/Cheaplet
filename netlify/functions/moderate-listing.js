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

        // 1. STRICT INPUT CHECK
        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return { 
                statusCode: 200, 
                headers: corsHeaders, 
                body: JSON.stringify({ verdict: "UNSAFE", reason: "No images detected. You must upload a clear photo of the item." }) 
            };
        }

        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;

        // 2. DOWNLOAD IMAGES WITH ERROR TRACKING
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

        // FAIL-CLOSED: If we couldn't download the images, don't let it through.
        if (imageDataArray.length === 0) {
            return { 
                statusCode: 200, 
                headers: corsHeaders, 
                body: JSON.stringify({ verdict: "UNSAFE", reason: "Image processing failed. Please ensure your photos are valid JPG/PNG files." }) 
            };
        }

        // 3. ULTRA-STRICT PROMPT
        const prompt = `You are a ruthless Safety AI for a student marketplace. 
        Analyze the image and text: Title: "${title}", Desc: "${description}".

        REJECT (UNSAFE) IMMEDIATELY IF:
        - The image is PITCH BLACK, extremely dark, or empty.
        - The image is a random landscape, nature photo, or meme (SPAM).
        - The image is pornographic, suggestive, or shows lingerie/swimwear.
        - The text contains the word "porn" or other explicit slurs.
        - The image is a screenshot of a website or an advertisement.

        APPROVE (SAFE) ONLY IF:
        - It is a CLEAR photo of a physical student item (textbook, laptop, clothes, furniture).

        JSON OUTPUT ONLY:
        {"verdict": "SAFE", "reason": "valid"} or {"verdict": "UNSAFE", "reason": "reason here"}`;

        // 4. CALL GEMINI
        let finalVerdict = { verdict: "UNSAFE", reason: "Security system timeout or error." };

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
            // Check for Google Safety Block
            if (aiData.candidates && aiData.candidates[0]?.finishReason === "SAFETY") {
                return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Content blocked by safety filters." }) };
            }

            if (aiData.candidates && aiData.candidates[0]?.content?.parts?.[0]?.text) {
                let aiText = aiData.candidates[0].content.parts[0].text.replace(/```json/gi, '').replace(/```/g, '').trim();
                try {
                    const result = JSON.parse(aiText);
                    if (result.verdict === "UNSAFE") {
                        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(result) };
                    }
                    finalVerdict = { verdict: "SAFE" }; // If we reach here and it's not unsafe, it's safe.
                } catch (e) {
                    // Fail-closed on parsing error
                    if (aiText.toUpperCase().includes("UNSAFE")) {
                        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "AI flagged content." }) };
                    }
                }
            }
        }

        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(finalVerdict) };

    } catch (error) {
        // FAIL-CLOSED on system error
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Moderation system error." }) };
    }
};
