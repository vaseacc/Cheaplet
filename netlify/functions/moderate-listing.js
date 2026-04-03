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

        // 4. Simplified prompt – ask for only "SAFE" or "UNSAFE"
        const prompt = `You are a strict safety moderator for a college marketplace.
        Image and text: Title: "${title || ''}", Description: "${description || ''}".
        Does this listing contain nudity, pornography, explicit content, or inappropriate words like "nude", "naked", "sex", "porn"? 
        Answer with exactly one word: SAFE or UNSAFE. Nothing else.`;

        // 5. Call Gemini
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
            console.log("Raw AI response:", JSON.stringify(aiData, null, 2));
            
            // Safety filter triggered
            if (aiData.candidates && aiData.candidates[0]?.finishReason === "SAFETY") {
                isSafe = false;
                rejectReason = "Explicit content blocked by safety filters.";
                break;
            }
            
            // Extract text response
            if (aiData.candidates && aiData.candidates[0]?.content?.parts?.[0]?.text) {
                let aiText = aiData.candidates[0].content.parts[0].text.trim().toUpperCase();
                console.log("AI text response:", aiText);
                
                if (aiText.includes("UNSAFE")) {
                    isSafe = false;
                    rejectReason = "AI flagged as unsafe (contains nudity/explicit content)";
                    break;
                } else if (aiText.includes("SAFE")) {
                    // Continue checking other images – but if any says UNSAFE, reject
                    continue;
                } else {
                    // Unclear response – assume unsafe
                    isSafe = false;
                    rejectReason = "AI returned unclear response, rejecting to be safe.";
                    break;
                }
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
