exports.handler = async (event, context) => {
    console.log("--- MODERATION ENGINE ACTIVATED ---");
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const data = JSON.parse(event.body);
        const { listingId, imageUrl, title, description } = data;
        
        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;
        const FB_KEY = process.env.VITE_FIREBASE_API_KEY;
        const PROJ_ID = process.env.VITE_FIREBASE_PROJECT_ID;

        if (!GEMINI_KEY || !FB_KEY || !PROJ_ID) {
            console.error("ERROR: Missing Environment Variables in Netlify!");
            return { statusCode: 500, body: "Server Config Error" };
        }

        console.log(`Checking Listing: ${title}`);

        // 1. Download image & convert to Base64 for Gemini
        let base64Image = null;
        if (imageUrl) {
            try {
                const imgRes = await fetch(imageUrl);
                const buffer = await imgRes.arrayBuffer();
                base64Image = Buffer.from(buffer).toString('base64');
                console.log("Image attached to AI prompt.");
            } catch (e) { console.log("Image download failed, checking text only."); }
        }

        // 2. Ask Gemini 1.5 Flash
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        const promptParts = [{ text: `You are a marketplace moderator. Look at this item. Is it inappropriate (Guns, drugs, nudity, violence, or scams)? 
            Used textbooks and electronics are SAFE. 
            Title: ${title} 
            Description: ${description} 
            Reply with ONLY 'SAFE' or 'UNSAFE'.` }];
        
        if (base64Image) {
            promptParts.push({ inlineData: { mimeType: "image/jpeg", data: base64Image } });
        }

        const aiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: promptParts }] })
        });

        const aiData = await aiRes.json();
        let verdict = "SAFE";
        if (aiData.candidates && aiData.candidates[0]) {
            verdict = aiData.candidates[0].content.parts[0].text.trim().toUpperCase();
        }
        console.log("AI Verdict:", verdict);

        // 3. Update Firebase via REST API
        // We use the PATCH method to update just the status field
        const newStatus = verdict.includes("UNSAFE") ? "rejected" : "active";
        const fbUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?updateMask.fieldPaths=status&key=${FB_KEY}`;
        
        const updateRes = await fetch(fbUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: { status: { stringValue: newStatus } } })
        });

        console.log("Database Updated to:", newStatus);
        console.log("--- MODERATION COMPLETE ---");

        return { statusCode: 200, body: JSON.stringify({ success: true, status: newStatus }) };

    } catch (error) {
        console.error("CRASH:", error.message);
        return { statusCode: 500, body: error.message };
    }
};
