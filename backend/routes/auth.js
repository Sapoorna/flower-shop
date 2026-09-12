const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const {
  text,
  email,
  password,
  hash,
  rateLimit,
  issueSession,
  cookieOptions
} = require('../lib/security');
const attempts = rateLimit(20, 15 * 60000);
const dummyHash = bcrypt.hash('a timing-only comparison value', 12);
router.post('/register', attempts, async (req, res) => {
  const user = new User({
    firstName: text(req.body.firstName, 'first name', 1, 60),
    lastName: text(req.body.lastName, 'last name', 1, 60),
    email: email(req.body.email),
    password: password(req.body.password)
  });
  await user.save();
  issueSession(res, user);
  res.status(201).json({ user });
});
router.post('/login', attempts, async (req, res) => {
  const address = email(req.body.email);
  if (typeof req.body.password !== 'string' || req.body.password.length > 200)
    return res.status(400).json({ message: 'Please enter a valid password.' });
  const user = await User.findOne({ email: address }).select('+password');
  const valid = user
    ? await user.comparePassword(req.body.password)
    : await bcrypt.compare(req.body.password, await dummyHash);
  if (!user || !valid) return res.status(401).json({ message: 'Email or password is incorrect.' });
  user.lastLogin = new Date();
  await user.save();
  issueSession(res, user);
  res.json({ user });
});
router.get('/me', authMiddleware, (req, res) => res.json({ user: req.user }));
router.put('/me', authMiddleware, async (req, res) => {
  req.user.firstName = text(req.body.firstName, 'first name', 1, 60);
  req.user.lastName = text(req.body.lastName, 'last name', 1, 60);
  req.user.phone = text(req.body.phone || '', 'phone number', 0, 25);
  await req.user.save();
  res.json({ user: req.user, message: 'Profile updated.' });
});
router.post('/logout', async (req, res) => {
  try {
    const d = jwt.verify(req.cookies.flore_session, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
    await User.updateOne({ _id: d.userId, tokenVersion: d.version }, { $inc: { tokenVersion: 1 } });
  } catch (error) {
    if (!['JsonWebTokenError', 'TokenExpiredError'].includes(error.name)) throw error;
  }
  res.clearCookie('flore_session', cookieOptions());
  res.json({ message: 'Signed out.' });
});
router.put('/change-password', attempts, authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId).select('+password');
  if (
    typeof req.body.currentPassword !== 'string' ||
    !(await user.comparePassword(req.body.currentPassword))
  )
    return res.status(400).json({ message: 'Current password is incorrect.' });
  user.password = password(req.body.newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.resetHash = undefined;
  user.resetExpires = undefined;
  await user.save();
  issueSession(res, user);
  res.json({ message: 'Password updated. Other sessions have been signed out.' });
});
router.post('/forgot-password', rateLimit(5, 15 * 60000), async (req, res) => {
  const address = email(req.body.email);
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM || !process.env.FRONTEND_URL)
    return res
      .status(503)
      .json({ message: 'Password reset emails are not available yet. Please try again later.' });
  const user = await User.findOne({ email: address });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetHash = hash(token);
    user.resetExpires = new Date(Date.now() + 30 * 60000);
    await user.save();
    const link = `${new URL(process.env.FRONTEND_URL).origin}/reset-password.html#token=${token}`;
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
        body: JSON.stringify({
          sender: { name: 'Floré', email: process.env.MAIL_FROM },
          to: [{ email: address }],
          subject: 'Reset your Floré password',
          textContent: `Use this link to reset your password: ${link}\nThis link expires in 30 minutes and can be used once. If you did not request this, ignore this email.`
        })
      });
      if (!response.ok) throw new Error('Mail provider rejected request');
    } catch {
      await User.updateOne(
        { _id: user.id, resetHash: hash(token) },
        { $unset: { resetHash: 1, resetExpires: 1 } }
      );
      console.error('Password reset email delivery failed. Check email provider configuration.');
    }
  }
  res.json({
    message:
      'If an account matches that email, a reset link will arrive shortly. Check your spam folder too.'
  });
});
router.post('/reset-password', attempts, async (req, res) => {
  const token = text(req.body.token, 'reset link', 64, 64);
  const encoded = await bcrypt.hash(password(req.body.password), 12);
  const user = await User.findOneAndUpdate(
    { resetHash: hash(token), resetExpires: { $gt: new Date() } },
    {
      $set: { password: encoded },
      $inc: { tokenVersion: 1 },
      $unset: { resetHash: 1, resetExpires: 1 }
    },
    { new: true }
  );
  if (!user)
    return res
      .status(400)
      .json({ message: 'This reset link is invalid or expired. Please request another.' });
  res.clearCookie('flore_session', cookieOptions());
  res.json({ message: 'Password reset. You can now sign in.' });
});
const passport = require('../config/passport');
router.use(passport.initialize());
router.get('/google', attempts, (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    return res.redirect('/login.html?error=google_unavailable');
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie('flore_oauth', jwt.sign({ state }, process.env.JWT_SECRET, { expiresIn: '10m' }), {
    ...cookieOptions(),
    maxAge: 600000
  });
  passport.authenticate('google', { scope: ['profile', 'email'], session: false, state })(
    req,
    res,
    next
  );
});
router.get('/google/callback', (req, res, next) => {
  try {
    const d = jwt.verify(req.cookies.flore_oauth, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
    if (d.state !== req.query.state) throw Error();
  } catch {
    return res.redirect('/login.html?error=google_failed');
  }
  res.clearCookie('flore_oauth', cookieOptions());
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) return res.redirect('/login.html?error=google_failed');
    issueSession(res, user);
    res.redirect('/profile.html');
  })(req, res, next);
});
module.exports = router;
