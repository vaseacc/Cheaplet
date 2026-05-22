import { getFirebaseConfig, getCloudinaryConfig } from '../lib/config.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const hostname = req.headers.host;
  // Always use chaeplet.firebaseapp.com as authDomain to match Firebase Console configuration
  const firebase = getFirebaseConfig(process.env, hostname, "chaeplet.firebaseapp.com");
  const cloudinary = getCloudinaryConfig(process.env);
  res.json({ firebaseConfig: firebase, cloudinary });
}
