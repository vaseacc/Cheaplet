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

        // 1. Give Cloudinary a moment to breathe (Ensures images are live)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 2. Environment Keys (Check both standard and VITE_ prefixes)
        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        
        if (!GEMINI_KEY) {
            console.error("Internal Error: GEMINI_API_KEY is missing from environment variables.");
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
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Security check failed: Image could not be processed. Try a different photo format." }) };
        }

        // 4. THE PROMPT
        const prompt = `You are a strict Safety AI for a college marketplace. 
        Analyze the image and text: Title: "${title}", Desc: "${description}".

        REJECT (UNSAFE) IF:
        - The image is PITCH BLACK, empty, or unidentifiable.
        - The image is a random landscape, nature photo, car, or pet (SPAM).
        - The image is pornographic, suggestive (lingerie/swimwear), or explicit.
        - The text contains "porn" or explicit slurs.

        APPROVE (SAFE) ONLY IF:
        - It is a clear photo of a physical item students buy (Textbook, Laptop, Furniture, Calculator).

        JSON OUTPUT ONLY:
        {"verdict": "SAFE", "reason": "valid"} or {"verdict": "UNSAFE", "reason": "reason here"}`;

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
        let isSafe = false;
        let rejectReason = "Image flagged as inappropriate or spam.";

        for (const aiData of aiResults) {
            if (aiData.candidates && aiData.candidates[0]?.content?.parts?.[0]?.text) {
                let aiText = aiData.candidates[0].content.parts[0].text.replace(/```json/gi, '').replace(/```/g, '').trim();
                try {
                    const result = JSON.parse(aiText);
                    console.log("AI result:", result);
                    if (result.verdict === "SAFE") {
                        isSafe = true;
                    } else {
                        isSafe = false;
                        rejectReason = result.reason;
                        break; // If any image is unsafe, the whole thing is unsafe.
                    }
                } catch (e) {
                    console.log("Parsing error for AI response:", aiText);
                }
            } else if (aiData.candidates && aiData.candidates[0]?.finishReason === "SAFETY") {
                isSafe = false;
                rejectReason = "Explicit content blocked by safety filters.";
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
====
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

        // 1. Give Cloudinary a moment to breathe (Ensures images are live)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 2. Environment Keys (Check both standard and VITE_ prefixes)
        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        
        if (!GEMINI_KEY) {
            console.error("Internal Error: GEMINI_API_KEY is missing from environment variables.");
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
            return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ verdict: "UNSAFE", reason: "Security check failed: Image could not be processed. Try a different photo format." }) };
        }

        // 4. THE PROMPT - Made explicitly smart for books while strictly rejecting NSFW
        const prompt = `You are an elite, strict safety moderator for a college student marketplace that primarily sells BOOKS and course materials.
        Analyze the uploaded image(s) alongside this listing data:
        Title: "${title}"
        Description: "${description}"

        CRITICAL RULES - ZERO TOLERANCE FOR NSFW:
        - REJECT IMMEDIATELY if the image contains ANY nudity, partial nudity, pornography, sexual acts, lingerie, underwear, or highly suggestive posing.
        - REJECT IMMEDIATELY if the text/Title/Description contains explicit words like "nude", "nudes", "porn", "sex", "escort", "hookup", or slurs. (The word "nude" or "nudes" is an automatic reject).
        - REJECT IMMEDIATELY if the image shows illegal drugs, weapons, or graphic violence.
        - REJECT IMMEDIATELY if the image is completely pitch black or unidentifiable spam.

        RULES FOR APPROVAL (BOOKS & NORMAL ITEMS):
        - APPROVE if it is a book, textbook, novel, or biography.
        - IMPORTANT: If the image is a book cover featuring a real person (e.g., Elon Musk, a historical figure, a model on a magazine cover), it is perfectly SAFE and MUST BE APPROVED. Do not confuse a face on a book cover with a violation.
        - APPROVE standard student items (calculators, laptops, notes, school supplies).

        You must evaluate based on these rules and output the result.`;

        // 5. Call Gemini API using native JSON output format
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
        let isSafe = true; // Assume safe until proven guilty by one of the images
        let rejectReason = "Image flagged as inappropriate or spam.";

        for (const aiData of aiResults) {
            // Check if Gemini blocked it at the API level (Safety Settings)
            if (aiData.candidates && aiData.candidates[0]?.finishReason === "SAFETY") {
                isSafe = false;
                rejectReason = "Explicit content blocked by strict safety filters.";
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
                        break; // If any single image is unsafe, reject the whole listing.
                    }
                } catch (e) {
                    console.log("Parsing error for AI response. Assuming unsafe to be cautious.", e);
                    isSafe = false;
                    rejectReason = "System failed to parse safety verification.";
                    break;
                }
            } else {
                // Unexpected empty response
                isSafe = false;
                rejectReason = "Unrecognized image format or empty analysis.";
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
