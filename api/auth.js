const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';
const PASSWORD = process.env.APP_PASSWORD;

function createToken() {
  const payload = Buffer.from(
    JSON.stringify({ authenticated: true, iat: Date.now() })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('base64url');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, password, token } = req.body || {};

  if (action === 'verify') {
    const valid = verifyToken(token);
    return res.status(200).json({ valid });
  }

  if (!PASSWORD) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  if (password === PASSWORD) {
    const token = createToken();
    return res.status(200).json({ success: true, token });
  }

  return res.status(401).json({ success: false, error: 'Incorrect password' });
};
