// netlify/functions/moderate-listing.js
// This function is triggered by the frontend immediately after a listing is saved as "pending".
// It uses the Gemini API to check the title and description for inappropriate content.
// Since we don't have the heavy Firebase Admin SDK installed, we will use the secure Firebase REST API 
// to update the status directly in Firestore.

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const data = JSON.parse(event.body);
        const listingId = data.listingId;
        
        if (!listingId) {
            return { statusCode: 400, body: JSON.stringify({ error: "No listingId provided" }) };
        }

        const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
        const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

        // 1. Fetch the listing data from Firestore REST API
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/listings/${listingId}`;
        const listingRes = await fetch(firestoreUrl);
        const listingData = await listingRes.json();

        if (!listingData.fields) {
            return { statusCode: 404, body: JSON.stringify({ error: "Listing not found" }) };
        }

        const title = listingData.fields.title ? listingData.fields.title.stringValue : "";
        const description = listingData.fields.description ? listingData.fields.description.stringValue : "";
        const textToAnalyze = `Title: ${title}\nDescription: ${description}`;

        let isSafe = true; // Default to safe

        // 2. Call Gemini AI API for text analysis
        if (GEMINI_API_KEY && textToAnalyze.trim().length > 0) {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            
            const geminiPrompt = {
                contents: [{
                    parts: [{
                        text: `You are an automated safety moderator for a college textbook marketplace.
                        Check the following title and description for explicitly illegal content, extreme violence, deep hate speech, or explicit sexual services. 
                        Selling used textbooks or electronics is totally fine.
                        Reply EXACTLY with the word "SAFE" or "UNSAFE". Do not add any other words or punctuation.
                        
                        Content to analyze:
                        ${textToAnalyze}`
                    }]
                }]
            };

            const geminiRes = await fetch(geminiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(geminiPrompt)
            });

            const geminiData = await geminiRes.json();
            
            if (geminiData.candidates && geminiData.candidates[0]) {
                const aiVerdict = geminiData.candidates[0].content.parts[0].text.trim().toUpperCase();
                if (aiVerdict.includes("UNSAFE")) {
                    isSafe = false;
                }
            }
        }

        // 3. Update the document status in Firestore using REST API
        // FieldMask ensures we only update the 'status' field, leaving the rest intact.
        const newStatus = isSafe ? "active" : "rejected";
        
        const updateUrl = `${firestoreUrl}?updateMask.fieldPaths=status`;
        
        // This is an unauthenticated REST patch. 
        // Note: For this to work without an API key token in the URL, your Firestore security rules 
        // must allow the Netlify server to update the status. 
        // If your rules block unauthenticated updates, you must provide your Web API Key: `&key=${API_KEY}`
        await fetch(updateUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fields: {
                    status: { stringValue: newStatus }
                }
            })
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, status: newStatus })
        };

    } catch (error) {
        console.error("Moderation Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
