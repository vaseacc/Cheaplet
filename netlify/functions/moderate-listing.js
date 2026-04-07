exports.handler = async (event, context) => {
    // 1. CORS Headers
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers: corsHeaders, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: corsHeaders, body: "Method Not Allowed" };
    }

    try {
        // Extract the user's login token from the frontend request
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader) {
            console.error("Missing Authorization header");
            return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Unauthorized" }) };
        }

        const data = JSON.parse(event.body);
        let { listingId, imageUrls, title, description } = data;

        if (!imageUrls) {
            imageUrls = data.imageUrl ? [data.imageUrl] : [];
        } else if (!Array.isArray(imageUrls)) {
            imageUrls = [imageUrls];
        }

        if (!listingId) throw new Error("Missing listingId");

        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;
        const FB_KEY = process.env.VITE_FIREBASE_API_KEY;
        const PROJ_ID = process.env.VITE_FIREBASE_PROJECT_ID;

        console.log(`Starting AI scan for listing: ${listingId}`);

        // --- Fetch listing details (Anonymous read allowed by rules) ---
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

        if (imageUrls.length === 0) {
            console.log("No images found. Approving automatically.");
            return await approveListing(listingId, FB_KEY, PROJ_ID, corsHeaders, authHeader);
        }

        // --- Download images ---
        const imagesToScan = imageUrls.slice(0, 3); 
        const imagePromises = imagesToScan.map(async (imgUrl) => {
            try {
                const imgRes = await fetch(imgUrl);
                if (!imgRes.ok) return null;
                const buffer = await imgRes.arrayBuffer();
                return { url: imgUrl, base64: Buffer.from(buffer).toString('base64') };
            } catch (err) {
                console.error(`Failed to download ${imgUrl}:`, err.message);
                return null; 
            }
        });

        const imageDataArray = (await Promise.all(imagePromises)).filter(img => img !== null);

        // --- AI Prompt ---
        const prompt = `You are a strict safety AI for a college student marketplace. 
        The user is selling an item and the image is of the item itself (book, textbook, clothing, electronics, etc.).

        RULES:
        - If the image contains nudity, pornography, lingerie, swimwear, sexual poses, or any sexually suggestive content -> UNSAFE.
        - If the image shows actual weapons (real guns, knives, explosives, etc.) -> UNSAFE.
        - If the image shows drugs, marijuana, alcohol, vaping, smoking paraphernalia, or pills -> UNSAFE.
        - If the image shows counterfeit items, fake IDs, or illegal goods -> UNSAFE.
        - If the image is irrelevant (spam, memes, screenshots of text, QR codes not related to the item) -> UNSAFE.
        
        IMPORTANT EXCEPTIONS (SAFE):
        - Book covers, movie posters, video game covers, or any product packaging that contains illustrations or depictions of weapons (e.g., an arrow on a book cover) are SAFE because they are part of the product being sold.
        - Clothing items (except underwear/swimwear) are SAFE.
        - Textbooks, school supplies, electronics, and normal student items are SAFE.
        
        If you are even 1% unsure about a legitimate product, mark SAFE. Only mark UNSAFE if you are confident the image violates the above unsafe rules.

        LISTING TITLE: "${title}"
        LISTING DESCRIPTION: "${description}"

        OUTPUT EXACTLY THIS RAW JSON FORMAT AND NOTHING ELSE. DO NOT USE MARKDOWN BACKTICKS:
        {"verdict": "SAFE", "reason": "Brief explanation"}
        or
        {"verdict": "UNSAFE", "reason": "Brief explanation"}
        `;

        // --- Ask Gemini ---
        let isUnsafe = false;
        let finalReason = "";

        const aiPromises = imageDataArray.map(async (img) => {
            const aiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
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
            // If Google's internal safety filter blocks it, try to parse the response anyway
            // Only mark unsafe if we get an explicit UNSAFE verdict from our prompt
            if (aiData.candidates && aiData.candidates[0]?.finishReason === "SAFETY") {
                console.log("Google safety filter triggered, checking for actual verdict...");
                // Continue to check if there's still content in the response
            }

            if (aiData.candidates && aiData.candidates[0]?.content?.parts?.[0]?.text) {
                let aiText = aiData.candidates[0].content.parts[0].text;
                aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();

                try {
                    const result = JSON.parse(aiText);
                    console.log("AI Verdict:", result);
                    if (result.verdict === "UNSAFE") {
                        isUnsafe = true;
                        finalReason = result.reason || "AI flagged as unsafe";
                        break; 
                    }
                } catch (e) {
                    if (aiText.toUpperCase().includes("UNSAFE")) {
                        isUnsafe = true;
                        finalReason = "AI response indicated unsafe (fallback parsed)";
                        break;
                    }
                }
            }
        }

        // --- Apply verdict ---
        if (isUnsafe) {
            console.log(`Verdict: UNSAFE. Reason: ${finalReason}`);
            return await rejectListing(listingId, title, posterUid, posterName, FB_KEY, PROJ_ID, finalReason, corsHeaders, authHeader);
        } else {
            console.log(`Verdict: SAFE. Approving listing...`);
            return await approveListing(listingId, FB_KEY, PROJ_ID, corsHeaders, authHeader);
        }

    } catch (error) {
        console.error("Moderation error:", error);
        return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "Internal server error" }) };
    }
};

// Helper: Approve listing (Authenticated request)
async function approveListing(listingId, FB_KEY, PROJ_ID, corsHeaders, authHeader) {
    const fbDocUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?key=${FB_KEY}`;
    
    const response = await fetch(`${fbDocUrl}&updateMask.fieldPaths=status`, {
        method: "PATCH",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": authHeader
        },
        body: JSON.stringify({ 
            name: `projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}`,
            fields: { status: { stringValue: "active" } } 
        })
    });

    const resData = await response.json();
    if (!response.ok) console.error("FIRESTORE APPROVE ERROR:", JSON.stringify(resData));
    else console.log("FIRESTORE SUCCESS: Listing marked as active.");

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ status: "active" }) };
}

// Helper: Reject listing and create report (Authenticated request)
async function rejectListing(listingId, title, posterUid, posterName, FB_KEY, PROJ_ID, reason, corsHeaders, authHeader) {
    const fbDocUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?key=${FB_KEY}`;
    
    const response = await fetch(`${fbDocUrl}&updateMask.fieldPaths=status&updateMask.fieldPaths=imageUrls`, {
        method: "PATCH",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": authHeader 
        },
        body: JSON.stringify({
            name: `projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}`,
            fields: {
                status: { stringValue: "rejected" },
                imageUrls: { arrayValue: { values: [] } }
            }
        })
    });

    if (!response.ok) console.error("FIRESTORE REJECT ERROR:", JSON.stringify(await response.json()));
    else console.log("FIRESTORE SUCCESS: Listing marked as rejected.");

    // 2. Create Admin Report (with listingId added)
    const reportUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/reports?key=${FB_KEY}`;
    await fetch(reportUrl, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": authHeader 
        },
        body: JSON.stringify({
            fields: {
                reporterName: { stringValue: "AI Guard" },
                reporterUid: { stringValue: "system" },               
                targetUid: { stringValue: posterUid },                
                targetUserName: { stringValue: posterName },
                reason: { stringValue: "Automatic Content Block" },
                details: { stringValue: `Listing "${title}" (ID: ${listingId}) was blocked by AI. Reason: ${reason}` },
                timestamp: { timestampValue: new Date().toISOString() },
                type: { stringValue: "auto" },
                listingId: { stringValue: listingId }      // 👈 ADDED
            }
        })
    }).catch(err => console.error("Report creation failed:", err));

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ status: "rejected", reason }) };
}
