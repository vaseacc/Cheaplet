exports.handler = async (event, context) => {
    console.log("--- DEBUG MODERATION START ---");
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const data = JSON.parse(event.body);
        const { listingId, imageUrl, title, description } = data;
        
        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;
        const FB_KEY = process.env.VITE_FIREBASE_API_KEY;
        const PROJ_ID = process.env.VITE_FIREBASE_PROJECT_ID;

        if (!GEMINI_KEY) {
            console.error("MISSING API KEY: Check Netlify Environment Variables");
            return { statusCode: 500, body: "Missing API Key" };
        }

        // 1. Fetch Image
        let base64Image = null;
        if (imageUrl) {
            try {
                const imgRes = await fetch(imageUrl);
                const buffer = await imgRes.arrayBuffer();
                base64Image = Buffer.from(buffer).toString('base64');
                console.log("Image successfully prepared for AI.");
            } catch (e) { console.log("Image download failed."); }
        }

        // 2. Call Gemini
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        const promptParts = [{ text: `You are a strict security auditor.
            Does this listing contain WEAPONS, DRUGS, or NUDITY?
            Title: ${title}
            Description: ${description}
            Reply ONLY in this format:
            VERDICT: [SAFE or UNSAFE]` 
        }];
        
        if (base64Image) {
            promptParts.push({ inlineData: { mimeType: "image/jpeg", data: base64Image } });
        }

        const aiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: promptParts }] })
        });

        const aiData = await aiRes.json();
        
        // --- CRITICAL DEBUG LOG ---
        // This lets you see EXACTLY what Google is telling us.
        console.log("RAW AI RESPONSE:", JSON.stringify(aiData));

        let isUnsafe = false;

        if (aiData.candidates && aiData.candidates[0] && aiData.candidates[0].content) {
            const aiText = aiData.candidates[0].content.parts[0].text.toUpperCase();
            console.log("AI VERDICT TEXT:", aiText);
            if (aiText.includes("UNSAFE")) isUnsafe = true;
        } else if (aiData.promptFeedback) {
            console.warn("AI BLOCKED THE CONTENT VIA INTERNAL FILTERS:", aiData.promptFeedback);
            isUnsafe = true; // If Google blocks it, we assume it's unsafe.
        } else if (aiData.error) {
            console.error("API ERROR:", aiData.error.message);
            // On API error, we default to safe so the user isn't stuck, 
            // but you should check the logs!
        }

        const newStatus = isUnsafe ? "rejected" : "active";

        // 3. Update Firebase
        const fbUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?updateMask.fieldPaths=status&key=${FB_KEY}`;
        const fbRes = await fetch(fbUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: { status: { stringValue: newStatus } } })
        });

        console.log(`Final Decision for ${listingId}: ${newStatus}`);
        console.log("--- DEBUG MODERATION END ---");

        return { statusCode: 200, body: JSON.stringify({ status: newStatus }) };

    } catch (error) {
        console.error("FUNCTION CRASHED:", error.message);
        return { statusCode: 500, body: "Crash" };
    }
};
