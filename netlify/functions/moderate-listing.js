exports.handler = async (event, context) => {
    console.log("--- PROOF-OF-WORK MODERATION START ---");
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const data = JSON.parse(event.body);
        const { listingId, imageUrl, title, description } = data;
        
        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;
        const FB_KEY = process.env.VITE_FIREBASE_API_KEY;
        const PROJ_ID = process.env.VITE_FIREBASE_PROJECT_ID;

        // 1. Fetch Image
        let base64Image = null;
        if (imageUrl) {
            const imgRes = await fetch(imageUrl);
            const buffer = await imgRes.arrayBuffer();
            base64Image = Buffer.from(buffer).toString('base64');
        }

        // 2. The "Aggressive" Prompt
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        
        const promptParts = [{ text: `
            SYSTEM TASK: You are a strict security auditor for a student marketplace. 
            USER CONTENT TO ANALYZE:
            Title: "${title}"
            Description: "${description}"

            INSTRUCTIONS:
            1. Describe what is in the image in 5 words.
            2. Decide if this violates safety rules. 
            WEAPONS (GUNS, KNIVES), DRUGS, NUDITY, AND ALCOHOL ARE STRICTLY FORBIDDEN.
            
            OUTPUT FORMAT:
            You must reply in this EXACT format:
            DESCRIPTION: [your description]
            VERDICT: [SAFE or UNSAFE]
        ` }];
        
        if (base64Image) {
            promptParts.push({ inlineData: { mimeType: "image/jpeg", data: base64Image } });
        }

        const aiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: promptParts }] })
        });

        const aiData = await aiRes.json();
        
        // LOG EVERYTHING FOR PROOF
        const aiResponseText = aiData.candidates[0].content.parts[0].text;
        console.log("AI RAW RESPONSE:\n", aiResponseText);

        const isUnsafe = aiResponseText.toUpperCase().includes("VERDICT: UNSAFE");
        const newStatus = isUnsafe ? "rejected" : "active";

        // 3. Update Firebase
        const fbUrl = `https://firestore.googleapis.com/v1/projects/${PROJ_ID}/databases/(default)/documents/listings/${listingId}?updateMask.fieldPaths=status&key=${FB_KEY}`;
        await fetch(fbUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: { status: { stringValue: newStatus } } })
        });

        console.log(`Final Decision: ${newStatus}`);
        return { statusCode: 200, body: JSON.stringify({ status: newStatus }) };

    } catch (error) {
        console.error("CRASH:", error.message);
        return { statusCode: 500, body: "Error" };
    }
};
