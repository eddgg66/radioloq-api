if (!global._radioloqSessions) {
  global._radioloqSessions = new Map();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { session } = req.query;
  if (!session) return res.status(400).json({ valid: false, error: 'No session' });

  const data = global._radioloqSessions?.get(session);

  if (!data) return res.status(200).json({ valid: false, reason: 'Not found' });
  if (Date.now() > data.expiresAt) {
    global._radioloqSessions.delete(session);
    return res.status(200).json({ valid: false, reason: 'Expired' });
  }

  return res.status(200).json({
    valid: true,
    pkg: data.pkg,
    email: data.email,
    paidAt: data.paidAt,
  });
}
