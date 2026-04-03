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

        // 1. Give Cloudinary a moment
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 2. Environment Keys
        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        
        if (!GEMINI_KEY) {
            console.error("Internal Error: GEMINI_API_KEY is missing");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Moderation system configuration error." }) };
        }

        // 3. Download images (first 3)
        const imagePromises = imageUrls.slice(0, 3).map(async (imgUrl) => {
            try {
                const imgRes = await fetch(imgUrl);
                if (!imgRes.ok) return null;
                const buffer = await imgRes.arrayBuffer();
                return { base64: Buffer.from(buffer).toString('base64') };
            } catch (err) {
                console.error("Fetch error:", err.message);
                return null;
            }
        });

        const imageDataArray = (await Promise.all(imagePromises)).filter(img => img !== null);

        if (imageDataArray.length === 0) {
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Security check failed: Image could not be processed." }) };
        }

        // 4. Prompt – ask for JSON output (no schema enforcement)
        const prompt = `You are a STRICT safety moderator for a college marketplace.
        
        Analyze the image and text below.
        TEXT TITLE: "${title || ''}"
        TEXT DESCRIPTION: "${description || ''}"
        
        REJECT (UNSAFE) if:
        - ANY nudity, exposed genitals, breasts, or buttocks
        - ANY sexual content, pornography, or suggestive/erotic poses
        - ANY underwear, lingerie, or swimwear that is sexually suggestive
        - ANY explicit words: "nude", "naked", "porn", "sex", "erotic", "xxx", "onlyfans", "nsfw"
        - ANY mention of sexual services or adult content
        - Image is black, unidentifiable, or blurry beyond recognition
        - Image is random (nature, car, pet, meme) not related to selling an item
        
        APPROVE (SAFE) only if:
        - Image shows a physical item students buy/sell (textbook, laptop, calculator, furniture, fully covering clothing)
        - Text describes a legitimate item for sale
        - No inappropriate keywords
        
        CRITICAL: The word "nude" in ANY context must be REJECTED.
        
        Respond with ONLY valid JSON: {"verdict": "SAFE" or "UNSAFE", "reason": "short reason"}`;

        // 5. Call Gemini without responseSchema
        const aiPromises = imageDataArray.map(async (img) => {
            const aiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ 
                            parts: [
                                { text: prompt }, 
                                { inlineData: { mimeType: "image/jpeg", data: img.base64 } }
                            ] 
                        }]
                    })
                }
            );
            return aiRes.json();
        });

        const aiResults = await Promise.all(aiPromises);
        let isSafe = true;
        let rejectReason = "Image flagged as inappropriate.";

        for (const aiData of aiResults) {
            // Safety filter triggered
            if (aiData.candidates && aiData.candidates[0]?.finishReason === "SAFETY") {
                isSafe = false;
                rejectReason = "Explicit content blocked by safety filters.";
                break;
            }
            
            // Parse the text response
            if (aiData.candidates && aiData.candidates[0]?.content?.parts?.[0]?.text) {
                let aiText = aiData.candidates[0].content.parts[0].text;
                // Try to extract JSON
                const jsonMatch = aiText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const result = JSON.parse(jsonMatch[0]);
                        if (result.verdict === "UNSAFE") {
                            isSafe = false;
                            rejectReason = result.reason || "AI flagged as unsafe";
                            break;
                        }
                    } catch (e) {
                        console.log("JSON parse error:", e);
                    }
                }
                // If no JSON, assume unsafe to be cautious
                isSafe = false;
                rejectReason = "Unclear AI response, rejecting to be safe.";
                break;
            } else {
                isSafe = false;
                rejectReason = "AI did not return a valid response.";
                break;
            }
        }

        // 6. Backup keyword check (very strict)
        const textToCheck = `${title || ''} ${description || ''}`.toLowerCase();
        const bannedWords = ['nude', 'naked', 'porn', 'sex', 'erotic', 'xxx', 'onlyfans', 'nsfw', 'dick', 'cock', 'pussy', 'boobs', 'tits', 'ass', 'bitch', 'fuck', 'shit', 'cunt', 'whore', 'slut'];
        
        for (const word of bannedWords) {
            if (textToCheck.includes(word)) {
                isSafe = false;
                rejectReason = `Listing rejected: Contains inappropriate word "${word}"`;
                console.log(`Blocked due to banned word: ${word}`);
                break;
            }
        }

        if (isSafe) {
            console.log("Listing APPROVED.");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "SAFE" }) };
        } else {
            console.log("Listing REJECTED:", rejectReason);
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: rejectReason }) };
        }

    } catch (error) {
        console.error("Global Catch Error:", error);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "System error during moderation." }) };
    }
};
