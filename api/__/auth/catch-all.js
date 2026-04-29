// api/__/auth/catch-all.js (Vercel serverless function)
export default async function handler(req, res) {
  // Forward the request to Firebase Hosting
  const firebaseUrl = `https://cheaplet.firebaseapp.com/__/auth/${req.query.catchall.join('/')}?${new URLSearchParams(req.query).toString()}`;
  
  // Copy headers (especially origin/cookies)
  const headers = { ...req.headers };
  delete headers.host; // remove host to avoid issues

  const response = await fetch(firebaseUrl, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
  });

  // Send back the response
  res.status(response.status);
  for (const [key, value] of response.headers) {
    res.setHeader(key, value);
  }
  const body = await response.text();
  res.send(body);
}
