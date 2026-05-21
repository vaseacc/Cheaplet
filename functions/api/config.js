import { getFirebaseConfig, getCloudinaryConfig } from '../../lib/config.js';

export async function onRequest({ request, env }) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers });

  const hostname = new URL(request.url).hostname;
  // Force the Firebase Auth domain to your custom subdomain
  const firebase = getFirebaseConfig(env, hostname, 'auth.scoralia.ca');
  const cloudinary = getCloudinaryConfig(env);

  return new Response(JSON.stringify({ firebaseConfig: firebase, cloudinary }), { headers });
}
