exports.handler = async (event, context) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const data = JSON.parse(event.body);
        const { imageUrl, title, description } = data;
        const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

        if (!GEMINI_API_KEY) throw new Error("Missing Gemini API Key");

        // 1. Download the image from Cloudinary and convert it to Base64 for Gemini
        let base64Image = null;
        let mimeType = "image/jpeg";
        
        if (imageUrl) {
            const imageResponse = await fetch(imageUrl);
            const arrayBuffer = await imageResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            base64Image = buffer.toString('base64');
            
            // Guess mime type from URL
            if (imageUrl.toLowerCase().endsWith('.png')) mimeType = "image/png";
            if (imageUrl.toLowerCase().endsWith('.webp')) mimeType = "image/webp";
        }

        // 2. Build the payload for Gemini 1.5 Flash (Multimodal)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const promptParts = [
            { text: `You are an AI safety moderator for a college marketplace. 
            Analyze the attached image, title, and description. 
            Look for explicitly illegal items, weapons, extreme violence, deep hate speech, or pornography. 
            Selling used textbooks, notes, calculators, electronics, or clothes is TOTALLY SAFE.
            Title: "${title}"
            Description: "${description}"
            
            Reply ONLY with the exact word "SAFE" or "UNSAFE". Do not add any punctuation or explanation.` }
        ];

        // If we successfully got the image, attach it to the AI's prompt
        if (base64Image) {
            promptParts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                }
            });
        }

        const geminiPrompt = {
            contents: [{ parts: promptParts }]
        };

        // 3. Ask Gemini
        const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(geminiPrompt)
        });

        const geminiData = await geminiRes.json();
        
        let isSafe = true; // Default to safe if AI is confused
        if (geminiData.candidates && geminiData.candidates[0]) {
            const aiVerdict = geminiData.candidates[0].content.parts[0].text.trim().toUpperCase();
            console.log("Gemini Verdict:", aiVerdict); // You can see this in Netlify Function Logs!
            
            if (aiVerdict.includes("UNSAFE")) {
                isSafe = false;
            }
        }

        // Return the verdict to your frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ safe: isSafe })
        };

    } catch (error) {
        console.error("Moderation Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message, safe: true }) }; // Default to safe on error
    }
};
