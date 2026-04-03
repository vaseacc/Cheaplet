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

        // 1. Give Cloudinary a moment to breathe (Ensures images are live)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 2. Environment Keys
        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        
        if (!GEMINI_KEY) {
            console.error("Internal Error: GEMINI_API_KEY is missing");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Moderation system configuration error." }) };
        }

        // 3. Download images
        const imagesToScan = imageUrls.slice(0, 3); 
        const imagePromises = imagesToScan.map(async (imgUrl) => {
            try {
                const imgRes = await fetch(imgUrl);
                if (!imgRes.ok) {
                    console.log("Image not ready yet:", imgUrl);
                    return null;
                }
                const buffer = await imgRes.arrayBuffer();
                return { base64: Buffer.from(buffer).toString('base64') };
            } catch (err) {
                console.error("Fetch error for image:", err.message);
                return null; 
            }
        });

        const imageDataArray = (await Promise.all(imagePromises)).filter(img => img !== null);

        if (imageDataArray.length === 0) {
            console.log("Rejection: No valid images could be downloaded.");
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Security check failed: Image could not be processed." }) };
        }

        // 4. EXTREMELY STRICT PROMPT - NO TOLERANCE
        const prompt = `You are a STRICT safety moderator for a college marketplace for students.
        
        Analyze the image and text below.
        
        TEXT TITLE: "${title || ''}"
        TEXT DESCRIPTION: "${description || ''}"
        
        **IMMEDIATE REJECT (UNSAFE) if ANY of these are detected:**
        - ANY nudity, exposed genitals, exposed breasts, or buttocks
        - ANY sexual content, pornography, or suggestive/erotic poses
        - ANY underwear, lingerie, or swimwear that is sexually suggestive
        - ANY explicit words in the text: "nude", "naked", "porn", "sex", "erotic", "xxx", "onlyfans", "nsfw"
        - ANY mention of sexual services or adult content in the title or description
        - Image is completely black, unidentifiable, or blurry beyond recognition
        - Image is just a random photo (nature, car, pet, meme) not related to selling an item
        
        **APPROVE (SAFE) ONLY if ALL are true:**
        - The image shows a physical item that students would buy/sell (textbook, laptop, calculator, furniture, clothing that is fully covering)
        - The text describes a legitimate item for sale
        - No inappropriate or suspicious keywords
        
        **CRITICAL: The word "nude" in ANY context (even "nude color" or "nude shoes") should be REJECTED because it can be ambiguous and inappropriate for a college marketplace.**
        
        Respond with JSON only. No markdown, no extra text.`;

        // 5. Call Gemini API with strict JSON output
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
                        }],
                        generationConfig: {
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: "OBJECT",
                                properties: {
                                    verdict: { type: "STRING", enum: ["SAFE", "UNSAFE"] },
                                    reason: { type: "STRING" }
                                },
                                required: ["verdict", "reason"]
                            }
                        }
                    })
                }
            );
            return aiRes.json();
        });

        const aiResults = await Promise.all(aiPromises);
        
        // Track if any image is unsafe
        let isSafe = true;
        let rejectReason = "Image flagged as inappropriate.";
        let allReasons = [];

        for (const aiData of aiResults) {
            // Check if Gemini blocked it at the API level
            if (aiData.candidates && aiData.candidates[0]?.finishReason === "SAFETY") {
                isSafe = false;
                rejectReason = "Explicit content blocked by safety filters.";
                console.log("Blocked by safety filters");
                break;
            }
            
            // Check the JSON response
            if (aiData.candidates && aiData.candidates[0]?.content?.parts?.[0]?.text) {
                try {
                    const result = JSON.parse(aiData.candidates[0].content.parts[0].text);
                    console.log("AI result:", result);
                    if (result.verdict === "UNSAFE") {
                        isSafe = false;
                        rejectReason = result.reason;
                        allReasons.push(result.reason);
                        console.log("Unsafe verdict from AI:", result.reason);
                        break; // One unsafe image = reject entire listing
                    }
                } catch (e) {
                    console.log("Parsing error for AI response:", e);
                    isSafe = false;
                    rejectReason = "System failed to parse safety verification.";
                    break;
                }
            } else {
                console.log("Unexpected AI response format:", JSON.stringify(aiData));
                isSafe = false;
                rejectReason = "Unrecognized AI response format.";
                break;
            }
        }

        // 6. Additional text-based keyword check (backup)
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
