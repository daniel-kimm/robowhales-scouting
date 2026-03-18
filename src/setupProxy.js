const crypto = require('crypto');
require('dotenv').config();

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

module.exports = function (app) {
  app.use('/api/auth', require('express').json(), (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, password, token } = req.body || {};

    if (action === 'verify') {
      return res.json({ valid: verifyToken(token) });
    }

    if (!PASSWORD) {
      return res.status(500).json({ error: 'Server misconfigured — set APP_PASSWORD in .env' });
    }

    if (password === PASSWORD) {
      return res.json({ success: true, token: createToken() });
    }

    return res.status(401).json({ success: false, error: 'Incorrect password' });
  });
};
