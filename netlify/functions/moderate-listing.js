exports.handler = async (event, context) => {
    console.log("--- MODERATION ATTEMPT (STABLE API) ---");
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

        // 2. Call Gemini (USING STABLE v1 ENDPOINT)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        
        const promptParts = [{ text: `Is this listing safe for a student marketplace? 
            Check for weapons (guns/knives), drugs, or nudity. 
            Used books and calculators are safe.
            Title: ${title}
            Description: ${description}
            Reply with ONLY the word SAFE or UNSAFE.` 
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
        console.log("RAW RESPONSE FROM GOOGLE:", JSON.stringify(aiData));

        let isUnsafe = false;

        // Check if the AI gave a verdict
        if (aiData.candidates && aiData.candidates[0] && aiData.candidates[0].content) {
            const aiText = aiData.candidates[0].content.parts[0].text.toUpperCase();
            console.log("AI VERDICT:", aiText);
            if (aiText.includes("UNSAFE")) isUnsafe = true;
        } 
        // IMPORTANT: If Google blocks the response entirely due to "SAFETY", it means it saw something dangerous
        else if (aiData.candidates && aiData.candidates[0] && aiData.candidates[0].finishReason === "SAFETY") {
            console.warn("GOOGLE BLOCKED CONTENT DUE TO SAFETY: Rejecting listing.");
            isUnsafe = true; 
        }

        const newStatus = isUnsafe ? "rejected" : "active";

        // 3. Update Firebase
        const fbUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?updateMask.fieldPaths=status&key=${FB_KEY}`;
        await fetch(fbUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: { status: { stringValue: newStatus } } })
        });

        console.log(`Final Status: ${newStatus}`);
        return { statusCode: 200, body: JSON.stringify({ status: newStatus }) };

    } catch (error) {
        console.error("CRASH:", error.message);
        return { statusCode: 500, body: "Error" };
    }
};
