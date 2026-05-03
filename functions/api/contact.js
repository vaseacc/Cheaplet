// functions/api/contact.js
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Cloudflare Pages uses onRequest for Functions
export async function onRequest({ request, env }) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Only accept POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Basic validation
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ success: false, error: 'Missing fields' }), { status: 400, headers });
    }

    // Initialize Firebase Admin using environment variables
    // (You need to set these in Cloudflare Pages dashboard or wrangler.toml)
    const app = getApps().length === 0
      ? initializeApp({
          credential: admin.credential.cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        })
      : getApp();

    const db = getFirestore(app);

    await db.collection('contact_messages').add({
      name,
      email,
      message,
      createdAt: new Date(),
    });

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal error' }), { status: 500, headers });
  }
}
