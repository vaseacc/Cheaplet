export default async function handler(req, res) {
  const slug = req.query.slug; // array of path segments
  const firebaseUrl = `https://cheaplet.firebaseapp.com/__/auth/${slug.join('/')}`;
  
  // Forward query string as well
  const targetUrl = new URL(firebaseUrl);
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'slug') continue; // Vercel puts it in slug already
    if (Array.isArray(value)) {
      value.forEach(v => targetUrl.searchParams.append(key, v));
    } else {
      targetUrl.searchParams.set(key, value);
    }
  }

  // Remove host header to avoid confusion
  const headers = { ...req.headers };
  delete headers.host;

  try {
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    });

    res.status(response.status);
    for (const [key, value] of response.headers) {
      res.setHeader(key, value);
    }
    const body = await response.text();
    res.send(body);
  } catch (error) {
    res.status(500).send('Proxy error');
  }
}
