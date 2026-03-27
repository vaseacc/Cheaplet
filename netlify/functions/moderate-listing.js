exports.handler = async (event, context) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const data = JSON.parse(event.body);
        const { listingId, imageUrls, title, description, tags } = data;

        // Validate input
        if (!listingId) throw new Error("Missing listingId");
        if (!imageUrls || !Array.isArray(imageUrls)) throw new Error("Missing or invalid imageUrls");

        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;
        const FB_KEY = process.env.VITE_FIREBASE_API_KEY;
        const PROJ_ID = process.env.VITE_FIREBASE_PROJECT_ID;

        // --- Step 0: Fetch listing details to get poster info ---
        const listingDocUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?key=${FB_KEY}`;
        const listingRes = await fetch(listingDocUrl);
        let posterUid = "unknown";
        let posterName = "Unknown User";
        if (listingRes.ok) {
            const listingData = await listingRes.json();
            const fields = listingData.fields;
            posterUid = fields.posterUid?.stringValue || "unknown";
            posterName = fields.posterDisplayName?.stringValue || "Unknown User";
        }

        // --- Step 1: Download and prepare all images as base64 ---
        const imageDataArray = [];
        for (const imgUrl of imageUrls) {
            try {
                const imgRes = await fetch(imgUrl);
                if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
                const buffer = await imgRes.arrayBuffer();
                imageDataArray.push({
                    url: imgUrl,
                    base64: Buffer.from(buffer).toString('base64')
                });
            } catch (err) {
                console.error(`Image download failed for ${imgUrl}:`, err.message);
                // If any image fails to download, treat as unsafe (could be malicious)
                return await rejectListing(listingId, title, posterUid, posterName, FB_KEY, PROJ_ID, "Image download failed");
            }
        }

        // --- Step 2: Zero‑Tolerance prompt ---
        const prompt = `You are a strict safety auditor for a student marketplace. You must inspect the provided image and determine if it violates our content policy. The listing title is: "${title}" and description: "${description}".

        PROHIBITED CONTENT (any occurrence = UNSAFE):
        - Nudity, partial nudity, exposed genitalia, breasts, buttocks, or sexual poses.
        - Sexually suggestive content, lingerie, or any content that could be interpreted as adult-oriented.
        - Violence, gore, injuries, or cruelty.
        - Weapons (guns, knives, explosives) or accessories that could be used as weapons.
        - Drugs, drug paraphernalia, alcohol, tobacco, or vaping products.
        - Illegal items, counterfeit goods, or items that violate school policies.
        - Any content that is not relevant to a school marketplace (e.g., memes, unrelated images, spam).
        
        IMPORTANT: If the image is even slightly questionable, mark it UNSAFE. Er on the side of caution. This is a platform for students.
        
        Respond ONLY with a JSON object in the following format:
        {"verdict": "SAFE" or "UNSAFE", "reason": "Short explanation"}
        `;

        // --- Step 3: Check each image sequentially (stop on first unsafe) ---
        let isUnsafe = false;
        let finalReason = "";

        for (const img of imageDataArray) {
            const aiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
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

            const aiData = await aiRes.json();

            // Check if the AI blocked the request (safety filters)
            if (aiData.candidates && aiData.candidates[0]?.finishReason === "SAFETY") {
                isUnsafe = true;
                finalReason = "Google safety filters blocked the image.";
                break;
            }

            // Parse AI response
            if (aiData.candidates && aiData.candidates[0]?.content?.parts?.[0]?.text) {
                const aiText = aiData.candidates[0].content.parts[0].text;
                try {
                    const result = JSON.parse(aiText);
                    if (result.verdict === "UNSAFE") {
                        isUnsafe = true;
                        finalReason = result.reason || "AI flagged as unsafe";
                        break;
                    }
                } catch (e) {
                    // Fallback: check if text contains "UNSAFE"
                    if (aiText.toUpperCase().includes("UNSAFE")) {
                        isUnsafe = true;
                        finalReason = "AI response indicated unsafe (parsing fallback)";
                        break;
                    }
                }
            } else {
                // No valid response – treat as unsafe
                isUnsafe = true;
                finalReason = "No valid AI response";
                break;
            }
        }

        // --- Step 4: Apply verdict to Firestore ---
        if (isUnsafe) {
            return await rejectListing(listingId, title, posterUid, posterName, FB_KEY, PROJ_ID, finalReason);
        } else {
            return await approveListing(listingId, FB_KEY, PROJ_ID);
        }

    } catch (error) {
        console.error("Moderation error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
    }
};

// Helper: Reject listing, clear images, and create a report for admin center
async function rejectListing(listingId, title, posterUid, posterName, FB_KEY, PROJ_ID, reason) {
    const fbDocUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?key=${FB_KEY}`;
    // Update status to "rejected" and clear imageUrls
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
            reporterUid: { stringValue: "system" },               // Added for consistency
            targetUid: { stringValue: posterUid },                // Now points to the actual user
            targetUserName: { stringValue: posterName },
            reason: { stringValue: "Automatic Content Block" },
            details: { stringValue: `Listing "${title}" (ID: ${listingId}) was blocked by AI. Reason: ${reason}` },
            timestamp: { timestampValue: new Date().toISOString() },
            type: { stringValue: "auto" }                         // Optional: mark as auto‑generated
        }
    };
    await fetch(reportUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData)
    }).catch(err => console.error("Report creation failed:", err));

    return { statusCode: 200, body: JSON.stringify({ status: "rejected", reason }) };
}

// Helper: Approve listing (set status to active)
async function approveListing(listingId, FB_KEY, PROJ_ID) {
    const fbDocUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?key=${FB_KEY}`;
    await fetch(`${fbDocUrl}&updateMask.fieldPaths=status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { status: { stringValue: "active" } } })
    }).catch(err => console.error("Firestore update failed:", err));

    return { statusCode: 200, body: JSON.stringify({ status: "active" }) };
}
