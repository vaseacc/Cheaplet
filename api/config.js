import { getFirebaseConfig, getCloudinaryConfig } from '../lib/config.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const hostname = req.headers.host;
  // Pass the hostname so authDomain is set to the actual domain (e.g., scoralia.ca)
  const firebase = getFirebaseConfig(process.env, hostname, null);
  const cloudinary = getCloudinaryConfig(process.env);
  res.json({ firebaseConfig: firebase, cloudinary });
}
