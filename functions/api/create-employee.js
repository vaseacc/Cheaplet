// /functions/api/create-employee.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// ── Environment variables (set in Cloudflare Pages) ──
const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!projectId || !privateKey || !clientEmail) {
  throw new Error('Missing Firebase Admin environment variables');
}

const app = initializeApp({
  credential: cert({ projectId, privateKey, clientEmail }),
});
const db = getFirestore(app);
const auth = getAuth(app);

export async function onRequest(context) {
  // Only POST
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { name, storeOwnerUid } = await context.request.json();

    if (!name || !storeOwnerUid) {
      return new Response(
        JSON.stringify({ error: 'Missing name or storeOwnerUid' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 1. Generate unique employeeId ──────────────
    const generateId = () => 'EMP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    let employeeId = generateId();
    let existing = await db.collection('employees').where('employeeId', '==', employeeId).get();
    while (!existing.empty) {
      employeeId = generateId();
      existing = await db.collection('employees').where('employeeId', '==', employeeId).get();
    }

    // ── 2. Generate password ──────────────────────
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const email = `employee-${employeeId}@store.scoralia.ca`;

    // ── 3. Create Firebase Auth user ──────────────
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // ── 4. Set custom claims ──────────────────────
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'employee',
      employeeId,
      storeOwnerUid,
    });

    // ── 5. Save employee to Firestore ─────────────
    await db.collection('employees').add({
      employeeId,
      name,
      storeOwnerUid,
      uid: userRecord.uid,
      createdAt: new Date().toISOString(),
    });

    // ── 6. Return credentials ─────────────────────
    return new Response(
      JSON.stringify({ employeeId, password }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Create employee error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
