const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

function issueToken(user, remember = false) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    env.JWT_SECRET,
    { expiresIn: remember ? env.JWT_REMEMBER_EXPIRES_IN : env.JWT_EXPIRES_IN }
  );
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [, token] = header.split(' ');
    if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

    const payload = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || user.accountStatus !== 'Active') return res.status(401).json({ error: 'Invalid or inactive account' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Session expired. Please log in again.' });
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { issueToken, requireAuth };
