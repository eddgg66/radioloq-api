module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://radioloq.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { session } = req.query;

  if (!session) {
    return res.status(400).json({ valid: false, error: 'No session ID provided' });
  }

  // Check session store
  const sessions = global._radioloqSessions || new Map();
  const data = sessions.get(session);

  if (!data) {
    return res.status(200).json({ valid: false, reason: 'Session not found' });
  }

  // Check expiry
  if (Date.now() > data.expiresAt) {
    sessions.delete(session);
    return res.status(200).json({ valid: false, reason: 'Session expired' });
  }

  // Valid — return session info
  return res.status(200).json({
    valid: true,
    pkg: data.pkg,
    email: data.email,
    paidAt: data.paidAt,
  });
};
