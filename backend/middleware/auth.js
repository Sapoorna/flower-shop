const jwt = require('jsonwebtoken');
const User = require('../models/User');
async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.flore_session;
    if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!require('mongoose').isValidObjectId(decoded.userId)) throw new Error('Invalid user');
    const user = await User.findById(decoded.userId);
    if (!user || (user.tokenVersion || 0) !== decoded.version)
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    if (
      ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name) ||
      error.message === 'Invalid user'
    )
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    next(error);
  }
}
module.exports = { authMiddleware };
