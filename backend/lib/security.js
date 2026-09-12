const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/'
});
function cookies(req, res, next) {
  req.cookies = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) {
      try {
        req.cookies[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1));
      } catch {}
    }
  }
  next();
}
function issueSession(res, user) {
  const token = jwt.sign(
    { userId: user.id, version: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
  res.cookie('flore_session', token, { ...cookieOptions(), maxAge: 7 * 86400000 });
}
function writeGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  const expected = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  if ((origin && origin !== new URL(expected).origin) || req.get('sec-fetch-site') === 'cross-site')
    return res.status(403).json({ message: 'Please submit this request from our website.' });
  if (!req.is('application/json') || req.get('x-flore-request') !== '1')
    return res.status(403).json({ message: 'Invalid request. Please refresh the page.' });
  next();
}
function rateLimit(max, windowMs) {
  const hits = new Map();
  const timer = setInterval(
    () => {
      const now = Date.now();
      for (const [key, value] of hits) if (value.end <= now) hits.delete(key);
    },
    Math.min(windowMs, 60000)
  );
  timer.unref();
  return (req, res, next) => {
    const now = Date.now(),
      key = req.ip;
    if (hits.size > 10000) return res.status(503).json({ message: 'Please try again shortly.' });
    let value = hits.get(key);
    if (!value || value.end <= now) {
      value = { count: 0, end: now + windowMs };
      hits.set(key, value);
    }
    if (++value.count > max) {
      res.set('Retry-After', String(Math.ceil((value.end - now) / 1000)));
      return res
        .status(429)
        .json({ message: 'Too many attempts. Please wait before trying again.' });
    }
    next();
  };
}
function text(value, label, min = 1, max = 100) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max)
    throw Object.assign(new Error(`Please enter a valid ${label}.`), { status: 400 });
  return value.trim();
}
function email(value) {
  const result = text(value, 'email address', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))
    throw Object.assign(new Error('Please enter a valid email address.'), { status: 400 });
  return result;
}
function password(value) {
  if (typeof value !== 'string' || value.length < 10 || Buffer.byteLength(value) > 72)
    throw Object.assign(
      new Error('Use a password with at least 10 characters and at most 72 bytes.'),
      { status: 400 }
    );
  return value;
}
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
module.exports = {
  cookies,
  cookieOptions,
  issueSession,
  writeGuard,
  rateLimit,
  text,
  email,
  password,
  hash
};
