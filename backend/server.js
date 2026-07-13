// ----- Required imports -----
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const helmet = require('helmet');
const session = require('express-session'); // ✅ NEW
const passport = require('./config/passport'); // ✅ NEW

// Load environment variables
dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// ✅ Session middleware (required for OAuth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret_here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// ✅ Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// ✅ Security middleware
app.use(helmet());

// ✅ CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5000',
  credentials: true
}));

// Middleware
app.use(morgan('dev'));
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ API Routes
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');
const customGiftRoutes = require('./routes/customGift');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/custom-gift-request', customGiftRoutes);

// Protected test route
app.get('/api/protected', require('./middleware/auth').authMiddleware, (req, res) => {
  res.json({ 
    message: 'You are authenticated!', 
    user: req.user 
  });
});

// Serve frontend static files
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// For all other routes, send index.html
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(publicPath, 'index.html'));
  } else {
    next();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));