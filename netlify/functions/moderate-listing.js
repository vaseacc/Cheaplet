exports.handler = async (event, context) => {
    console.log("--- STARTING SYSTEM DIAGNOSTICS ---");
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;
    const FB_KEY = process.env.VITE_FIREBASE_API_KEY;
    const PROJ_ID = process.env.VITE_FIREBASE_PROJECT_ID;

    try {
        // 1. LIST ALL AVAILABLE MODELS
        console.log("Fetching available models for your API key...");
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`);
        const listData = await listRes.json();

        if (listData.error) {
            console.error("API KEY ERROR:", listData.error.message);
            return { statusCode: 200, body: JSON.stringify({ status: "active", error: listData.error.message }) };
        }

        const modelNames = listData.models.map(m => m.name);
        console.log("STABLE MODELS AVAILABLE:", JSON.stringify(modelNames));

        // 2. AUTO-SELECT THE BEST MODEL
        // We look for 1.5-flash first, then 1.0-pro-vision
        const bestModel = modelNames.find(n => n.includes("gemini-1.5-flash")) || 
                          modelNames.find(n => n.includes("pro-vision")) || 
                          modelNames[0];

        console.log("SELECTED MODEL FOR MODERATION:", bestModel);

        // 3. PROCEED WITH MODERATION
        const data = JSON.parse(event.body);
        const { listingId, imageUrl, title, description } = data;

        let base64Image = null;
        if (imageUrl) {
            try {
                const imgRes = await fetch(imageUrl);
                const buffer = await imgRes.arrayBuffer();
                base64Image = Buffer.from(buffer).toString('base64');
            } catch (e) { console.log("Image download failed."); }
        }

        const genUrl = `https://generativelanguage.googleapis.com/v1beta/${bestModel}:generateContent?key=${GEMINI_KEY}`;
        const aiRes = await fetch(genUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `Is this listing safe? (No weapons/drugs/nudity). Title: ${title}. Description: ${description}. Reply ONLY 'SAFE' or 'UNSAFE'.` },
                        ...(base64Image ? [{ inlineData: { mimeType: "image/jpeg", data: base64Image } }] : [])
                    ]
                }]
            })
        });

        const aiData = await aiRes.json();
        let isUnsafe = false;

        if (aiData.candidates && aiData.candidates[0]) {
            if (aiData.candidates[0].finishReason === "SAFETY") {
                isUnsafe = true;
            } else if (aiData.candidates[0].content) {
                const text = aiData.candidates[0].content.parts[0].text.toUpperCase();
                console.log("AI VERDICT:", text);
                if (text.includes("UNSAFE")) isUnsafe = true;
            }
        }

        const newStatus = isUnsafe ? "rejected" : "active";

        // 4. Update Firebase
        const fbUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?updateMask.fieldPaths=status&key=${FB_KEY}`;
        await fetch(fbUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: { status: { stringValue: newStatus } } })
        });

        console.log(`FINAL STATUS: ${newStatus}`);
        console.log("--- DIAGNOSTICS COMPLETE ---");
        return { statusCode: 200, body: JSON.stringify({ status: newStatus }) };

    } catch (error) {
        console.error("CRITICAL SYSTEM FAILURE:", error.message);
        return { statusCode: 500, body: "System Error" };
    }
};
