exports.handler = async (event, context) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const data = JSON.parse(event.body);
        const { listingId, imageUrl, title, description, tags } = data;
        
        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;
        const FB_KEY = process.env.VITE_FIREBASE_API_KEY;
        const PROJ_ID = process.env.VITE_FIREBASE_PROJECT_ID;

        // 1. Prepare Image
        let base64Image = null;
        if (imageUrl) {
            try {
                const imgRes = await fetch(imageUrl);
                const buffer = await imgRes.arrayBuffer();
                base64Image = Buffer.from(buffer).toString('base64');
            } catch (e) { console.log("Image download failed."); }
        }

        // 2. The "Aggressive Zero-Tolerance" Prompt
        const genUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
        const aiRes = await fetch(genUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `CORE MISSION: You are a Zero-Tolerance Safety Auditor for a school marketplace.
                        
                        RULES:
                        - Reject (UNSAFE) any nudity, partial nudity, exposed skin in sexual areas, or sexually suggestive poses.
                        - Reject (UNSAFE) any weapons, drugs, or drug paraphernalia.
                        - Reject (UNSAFE) if the image is unrelated to a school marketplace.
                        - If the image is even SLIGHTLY suggestive or suspicious, you MUST mark it as UNSAFE. 
                        - Erring on the side of caution is mandatory.

                        Item Title: ${title}
                        Item Description: ${description}

                        Reply exactly in this JSON format:
                        { "verdict": "SAFE" or "UNSAFE", "reason": "Short explanation" }` },
                        ...(base64Image ? [{ inlineData: { mimeType: "image/jpeg", data: base64Image } }] : [])
                    ]
                }]
            })
        });

        const aiData = await aiRes.json();
        let isUnsafe = true; // Default to UNSAFE for maximum security

        if (aiData.candidates && aiData.candidates[0]) {
            const candidate = aiData.candidates[0];
            if (candidate.finishReason === "SAFETY") {
                isUnsafe = true;
                console.warn("GOOGLE FILTERS BLOCKED THIS IMAGE - INSTANT REJECTION");
            } else if (candidate.content) {
                try {
                    const result = JSON.parse(candidate.content.parts[0].text);
                    isUnsafe = result.verdict === "UNSAFE";
                    console.log("AI Verdict:", result.verdict, "Reason:", result.reason);
                } catch(e) {
                    // Fallback if AI doesn't reply in perfect JSON
                    if (candidate.content.parts[0].text.toUpperCase().includes("SAFE")) isUnsafe = false;
                    if (candidate.content.parts[0].text.toUpperCase().includes("UNSAFE")) isUnsafe = true;
                }
            }
        }

        const fbDocUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?key=${FB_KEY}`;
        
        if (isUnsafe) {
            // REJECTED: Wipe images immediately
            await fetch(`${fbDocUrl}&updateMask.fieldPaths=status&updateMask.fieldPaths=imageUrls`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fields: { status: { stringValue: "rejected" }, imageUrls: { arrayValue: { values: [] } } } })
            });

            // CREATE REPORT
            const reportUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/reports?key=${FB_KEY}`;
            await fetch(reportUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fields: {
                        reporterName: { stringValue: "AI Guard" },
                        reason: { stringValue: "Automatic NSFW Block" },
                        details: { stringValue: `Listing "${title}" was blocked by AI.` },
                        targetUid: { stringValue: "system" },
                        targetUserName: { stringValue: "AI Block" },
                        timestamp: { timestampValue: new Date().toISOString() }
                    }
                })
            });
        } else {
            // SAFE: Activate and ADD TAGS NOW (Securely)
            await fetch(`${fbDocUrl}&updateMask.fieldPaths=status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fields: { status: { stringValue: "active" } } })
            });

            // Handle Global Tag Increments here via REST if needed, 
            // but the most important part is that status is now 'active' only for safe items.
        }

        return { statusCode: 200, body: JSON.stringify({ status: isUnsafe ? "rejected" : "active" }) };

    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: "Error" };
    }
};
