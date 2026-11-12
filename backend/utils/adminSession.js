const { randomBytes } = require('crypto');

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const sessions = new Map();

exports.createAdminSession = (adminId) => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(token);
  }
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { adminId, expiresAt: now + SESSION_TTL_MS });
  return token;
};

exports.requireAdmin = (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const session = sessions.get(token);

  if (!session || session.expiresAt <= Date.now()) {
    if (session) sessions.delete(token);
    return res.status(401).json({ success: false, message: 'Please sign in as an admin to continue.' });
  }

  req.adminId = session.adminId;
  next();
};
