exports.handler = async (event, context) => {
    console.log("--- MULTI-MODEL MODERATION START ---");
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const data = JSON.parse(event.body);
        const { listingId, imageUrl, title, description } = data;
        
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

        // 2. Try Different Models (Google is finicky with names)
        const modelsToTry = [
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent",
            "https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent"
        ];

        let aiData = null;
        let successUrl = "";

        for (const baseUrl of modelsToTry) {
            console.log(`Trying model: ${baseUrl.split('/models/')[1].split(':')[0]}...`);
            try {
                const res = await fetch(`${baseUrl}?key=${GEMINI_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: `Is this safe for a student marketplace? No weapons, drugs, or nudity. Title: ${title}. Description: ${description}. Reply ONLY 'SAFE' or 'UNSAFE'.` },
                                ...(base64Image ? [{ inlineData: { mimeType: "image/jpeg", data: base64Image } }] : [])
                            ]
                        }]
                    })
                });
                const result = await res.json();
                if (!result.error) {
                    aiData = result;
                    successUrl = baseUrl;
                    break; // Stop trying once we find one that works!
                } else {
                    console.log(`Model failed: ${result.error.message}`);
                }
            } catch (e) { console.log("Fetch failed for this model."); }
        }

        if (!aiData) {
            console.error("ALL GOOGLE MODELS FAILED.");
            return { statusCode: 200, body: JSON.stringify({ status: "active", debug: "AI Offline" }) };
        }

        console.log("SUCCESS WITH:", successUrl);
        
        let isUnsafe = false;
        if (aiData.candidates && aiData.candidates[0]) {
            const candidate = aiData.candidates[0];
            if (candidate.finishReason === "SAFETY") {
                isUnsafe = true;
            } else if (candidate.content) {
                const aiText = candidate.content.parts[0].text.toUpperCase();
                if (aiText.includes("UNSAFE")) isUnsafe = true;
            }
        }

        const newStatus = isUnsafe ? "rejected" : "active";

        // 3. Update Firebase
        const fbUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?updateMask.fieldPaths=status&key=${FB_KEY}`;
        await fetch(fbUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: { status: { stringValue: newStatus } } })
        });

        console.log(`VERDICT: ${newStatus}`);
        return { statusCode: 200, body: JSON.stringify({ status: newStatus }) };

    } catch (error) {
        console.error("FATAL ERROR:", error.message);
        return { statusCode: 500, body: "Error" };
    }
};
