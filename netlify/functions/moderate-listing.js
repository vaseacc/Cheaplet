exports.handler = async (event, context) => {
    // 1. CORS Headers to prevent browser blocking
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: "Method Not Allowed" };
    }

    try {
        const data = JSON.parse(event.body);
        let { listingId, imageUrls, title, description } = data;

        // 2. Safely handle the imageUrls variable (Fixes the crash)
        if (!imageUrls) {
            // Fallback if the frontend sends `imageUrl` instead of `imageUrls`
            imageUrls = data.imageUrl ? [data.imageUrl] : [];
        } else if (!Array.isArray(imageUrls)) {
            imageUrls = [imageUrls];
        }

        if (!listingId) throw new Error("Missing listingId");

        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;
        const FB_KEY = process.env.VITE_FIREBASE_API_KEY;
        const PROJ_ID = process.env.VITE_FIREBASE_PROJECT_ID;

        // --- Step 3: Fetch listing details to get poster info ---
        const listingDocUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?key=${FB_KEY}`;
        const listingRes = await fetch(listingDocUrl);
        let posterUid = "unknown";
        let posterName = "Unknown User";
        if (listingRes.ok) {
            const listingData = await listingRes.json();
            const fields = listingData.fields || {};
            posterUid = fields.posterUid?.stringValue || "unknown";
            posterName = fields.posterDisplayName?.stringValue || "Unknown User";
        }

        // If no images to scan, approve text automatically
        if (imageUrls.length === 0) {
            return await approveListing(listingId, FB_KEY, PROJ_ID, headers);
        }

        // --- Step 4: Download images in PARALLEL (Prevents Netlify Timeouts) ---
        // We only scan the first 3 images to save time. Inappropriate content is almost always in the first few pics.
        const imagesToScan = imageUrls.slice(0, 3); 
        
        const imagePromises = imagesToScan.map(async (imgUrl) => {
            try {
                const imgRes = await fetch(imgUrl);
                if (!imgRes.ok) return null;
                const buffer = await imgRes.arrayBuffer();
                return { url: imgUrl, base64: Buffer.from(buffer).toString('base64') };
            } catch (err) {
                console.error(`Failed to download ${imgUrl}:`, err.message);
                return null; // Skip broken images instead of crashing
            }
        });

        // Filter out any images that failed to download
        const imageDataArray = (await Promise.all(imagePromises)).filter(img => img !== null);

        // --- Step 5: STRICT Zero-Tolerance Prompt ---
        const prompt = `You are a highly strict, zero-tolerance safety AI for a college student marketplace.
        Analyze this image, the title: "${title}", and the description: "${description}".

        IMMEDIATE REJECTION (UNSAFE) FOR ANY OF THE FOLLOWING:
        1. Nudity, pornography, lingerie, swimwear, cleavage, sexual poses, or suggestive content.
        2. Weapons, firearms, knives, explosives, or violence.
        3. Drugs, marijuana, alcohol, vaping, smoking paraphernalia, or pills.
        4. Counterfeit items, fake IDs, or illegal goods.
        5. Irrelevant spam, memes, screenshots of text, or QR codes.
        
        If the image is a textbook, school supply, electronics, clothing (not underwear/swimwear), or normal student item, it is SAFE.
        If you are even 1% unsure or it looks suspicious, output UNSAFE. Er on the side of caution.

        OUTPUT EXACTLY THIS RAW JSON FORMAT AND NOTHING ELSE. DO NOT USE MARKDOWN BACKTICKS:
        {"verdict": "SAFE", "reason": "Looks like a textbook"}
        or
        {"verdict": "UNSAFE", "reason": "Contains suggestive clothing/lingerie"}
        `;

        // --- Step 6: Ask Gemini to scan all images in PARALLEL ---
        let isUnsafe = false;
        let finalReason = "";

        const aiPromises = imageDataArray.map(async (img) => {
            const aiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
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

        // Evaluate all results
        for (const aiData of aiResults) {
            // Check if Google's internal safety filters blocked the request completely
            if (aiData.candidates && aiData.candidates[0]?.finishReason === "SAFETY") {
                isUnsafe = true;
                finalReason = "Google internal safety filters blocked the image.";
                break;
            }

            if (aiData.candidates && aiData.candidates[0]?.content?.parts?.[0]?.text) {
                let aiText = aiData.candidates[0].content.parts[0].text;
                
                // Clean markdown from Gemini response (Removes ```json and ```)
                aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();

                try {
                    const result = JSON.parse(aiText);
                    if (result.verdict === "UNSAFE") {
                        isUnsafe = true;
                        finalReason = result.reason || "AI flagged as unsafe";
                        break; // Stop checking other images, one unsafe is enough
                    }
                } catch (e) {
                    // Fallback: If JSON parsing fails, just look for the word UNSAFE
                    if (aiText.toUpperCase().includes("UNSAFE")) {
                        isUnsafe = true;
                        finalReason = "AI response indicated unsafe (fallback parsed)";
                        break;
                    }
                }
            }
        }

        // --- Step 7: Apply verdict to Firestore ---
        if (isUnsafe) {
            return await rejectListing(listingId, title, posterUid, posterName, FB_KEY, PROJ_ID, finalReason, headers);
        } else {
            return await approveListing(listingId, FB_KEY, PROJ_ID, headers);
        }

    } catch (error) {
        console.error("Moderation error:", error);
        return { 
            statusCode: 500, 
            headers: { "Access-Control-Allow-Origin": "*" }, 
            body: JSON.stringify({ error: "Internal server error" }) 
        };
    }
};

// Helper: Reject listing, clear images, and create a report for admin center
async function rejectListing(listingId, title, posterUid, posterName, FB_KEY, PROJ_ID, reason, headers) {
    const fbDocUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?key=${FB_KEY}`;
    
    // Update status to "rejected" and clear imageUrls so they don't load anywhere
    await fetch(`${fbDocUrl}&updateMask.fieldPaths=status&updateMask.fieldPaths=imageUrls`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            fields: {
                status: { stringValue: "rejected" },
                imageUrls: { arrayValue: { values: [] } }
            }
        })
    }).catch(err => console.error("Firestore update failed:", err));

    // Create a report so admins see it in the admin center
    const reportUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/reports?key=${FB_KEY}`;
    const reportData = {
        fields: {
            reporterName: { stringValue: "AI Guard" },
            reporterUid: { stringValue: "system" },               
            targetUid: { stringValue: posterUid },                
            targetUserName: { stringValue: posterName },
            reason: { stringValue: "Automatic Content Block" },
            details: { stringValue: `Listing "${title}" (ID: ${listingId}) was blocked by AI. Reason: ${reason}` },
            timestamp: { timestampValue: new Date().toISOString() },
            type: { stringValue: "auto" }                         
        }
    };
    
    await fetch(reportUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData)
    }).catch(err => console.error("Report creation failed:", err));

    return { statusCode: 200, headers, body: JSON.stringify({ status: "rejected", reason }) };
}

// Helper: Approve listing (set status to active)
async function approveListing(listingId, FB_KEY, PROJ_ID, headers) {
    const fbDocUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?key=${FB_KEY}`;
    
    await fetch(`${fbDocUrl}&updateMask.fieldPaths=status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { status: { stringValue: "active" } } })
    }).catch(err => console.error("Firestore update failed:", err));

    return { statusCode: 200, headers, body: JSON.stringify({ status: "active" }) };
}
