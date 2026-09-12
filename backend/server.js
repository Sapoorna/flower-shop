if (process.env.NODE_ENV !== 'test')
  require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');
const { cookies, writeGuard, rateLimit } = require('./lib/security');
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      }
    },
    referrerPolicy: { policy: 'no-referrer' }
  })
);
app.use(express.json({ limit: '30kb' }));
app.use(cookies);
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', writeGuard);
app.get('/api/health', (req, res) =>
  res
    .status(mongoose.connection.readyState === 1 ? 200 : 503)
    .json({ ready: mongoose.connection.readyState === 1 })
);
app.get('/api/config', (req, res) =>
  res.json({
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    passwordReset: Boolean(
      process.env.BREVO_API_KEY && process.env.MAIL_FROM && process.env.FRONTEND_URL
    )
  })
);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/custom-gift-request', rateLimit(10, 3600000), require('./routes/customGift'));
app.use('/api', (req, res) => res.status(404).json({ message: 'This endpoint does not exist.' }));
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    setHeaders(res, file) {
      if (file.endsWith('.html')) res.set('Cache-Control', 'no-cache');
    }
  })
);
app.get('/checkout', (req, res) => res.redirect('/checkout.html'));
app.get('/profile', (req, res) => res.redirect('/profile.html'));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === 11000)
    return res.status(409).json({ message: 'That entry already exists. Please try signing in.' });
  const status = error.status || (error.name === 'ValidationError' ? 400 : 500);
  if (status >= 500) console.error('Request failed:', error.name);
  res
    .status(status)
    .json({
      message:
        status < 500
          ? error.type === 'entity.parse.failed'
            ? 'Invalid request.'
            : error.message
          : 'We could not complete that request. Please try again.'
    });
});
async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error('Set JWT_SECRET to a random secret of at least 32 characters.');
  if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in the server environment.');
  if (process.env.NODE_ENV === 'production' && !/^https:\/\//.test(process.env.FRONTEND_URL || ''))
    throw new Error('Set FRONTEND_URL to the public HTTPS site URL.');
  await require('./config/db')();
  await Promise.all([require('./models/User').init(), require('./models/Order').init()]);
  return app.listen(process.env.PORT || 5000, '0.0.0.0', () =>
    console.log('Flore is ready on port', process.env.PORT || 5000)
  );
}
if (require.main === module)
  start().catch((error) => {
    console.error('Startup failed:', error.message);
    process.exitCode = 1;
  });
module.exports = { app, start };
