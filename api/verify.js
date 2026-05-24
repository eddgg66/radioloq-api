const rateLimits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30;
  if (!rateLimits.has(ip)) { rateLimits.set(ip, { count: 1, start: now }); return false; }
  const data = rateLimits.get(ip);
  if (now - data.start > windowMs) { rateLimits.set(ip, { count: 1, start: now }); return false; }
  if (data.count >= maxRequests) return true;
  data.count++;
  return false;
}

async function redisGet(key) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const res = await fetch(`${url}/get/${key}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.result) return null;
  try { return JSON.parse(data.result); } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://radioloq.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests' });

  const { session } = req.query;
  if (!session || session.length > 200) return res.status(400).json({ valid: false });

  if (session === 'paypal') return res.status(200).json({ valid: true, pkg: 'basic', source: 'paypal' });
  if (!session.startsWith('cs_')) return res.status(200).json({ valid: false, reason: 'Invalid format' });

  const data = await redisGet(`session:${session}`);
  if (!data) return res.status(200).json({ valid: false, reason: 'Not found' });

  return res.status(200).json({ valid: true, pkg: data.pkg, email: data.email, paidAt: data.paidAt });
}
