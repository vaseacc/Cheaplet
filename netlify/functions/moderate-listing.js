exports.handler = async (event, context) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const data = JSON.parse(event.body);
        const { listingId, imageUrl, title, description } = data;
        
        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;
        const FB_KEY = process.env.VITE_FIREBASE_API_KEY;
        const PROJ_ID = process.env.VITE_FIREBASE_PROJECT_ID;

        let base64Image = null;
        if (imageUrl) {
            const imgRes = await fetch(imageUrl);
            const buffer = await imgRes.arrayBuffer();
            base64Image = Buffer.from(buffer).toString('base64');
        }

        // 1. Call Gemini 2.5 Flash
        const genUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
        const aiRes = await fetch(genUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `STRICT MODERATION TASK: Analyze this listing. 
                        REJECT (UNSAFE) if you see: Nudity, Sexual Content, Weapons, Drugs, or Violence. 
                        APPROVE (SAFE) if it is a standard student item: Books, electronics, furniture, clothes.
                        Title: ${title}. Description: ${description}. 
                        Reply ONLY 'SAFE' or 'UNSAFE'.` },
                        ...(base64Image ? [{ inlineData: { mimeType: "image/jpeg", data: base64Image } }] : [])
                    ]
                }]
            })
        });

        const aiData = await aiRes.json();
        let isUnsafe = false;

        if (aiData.candidates && aiData.candidates[0]) {
            if (aiData.candidates[0].finishReason === "SAFETY") isUnsafe = true;
            else if (aiData.candidates[0].content) {
                if (aiData.candidates[0].content.parts[0].text.toUpperCase().includes("UNSAFE")) isUnsafe = true;
            }
        }

        // 2. Prepare Database Updates
        const fbDocUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?key=${FB_KEY}`;
        
        if (isUnsafe) {
            // REJECTED: Change status AND Delete images from DB
            await fetch(`${fbDocUrl}&updateMask.fieldPaths=status&updateMask.fieldPaths=imageUrls`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fields: {
                        status: { stringValue: "rejected" },
                        imageUrls: { arrayValue: { values: [] } } // Wipes the images
                    }
                })
            });

            // CREATE AUTOMATIC REPORT FOR ADMIN
            const reportUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/reports?key=${FB_KEY}`;
            await fetch(reportUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fields: {
                        reporterName: { stringValue: "Scoralia AI Guard" },
                        reason: { stringValue: "NSFW / Inappropriate Content Detected" },
                        details: { stringValue: `AI automatically blocked listing "${title}" (ID: ${listingId}) for safety violations.` },
                        targetUid: { stringValue: "system" },
                        targetUserName: { stringValue: "AI Block" },
                        timestamp: { timestampValue: new Date().toISOString() }
                    }
                })
            });

        } else {
            // SAFE: Just activate it
            await fetch(`${fbDocUrl}&updateMask.fieldPaths=status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fields: { status: { stringValue: "active" } } })
            });
        }

        return { statusCode: 200, body: JSON.stringify({ status: isUnsafe ? "rejected" : "active" }) };

    } catch (error) {
        return { statusCode: 500, body: "Error" };
    }
};
