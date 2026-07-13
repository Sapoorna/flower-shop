const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware, generateToken } = require('../middleware/auth');
const passport = require('passport');

// =============================================
//  EMAIL/PASSWORD AUTHENTICATION
// =============================================

//  REGISTER - Create new user
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        message: 'Please provide all required fields' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email' 
      });
    }

    // Create new user
    const user = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone || ''
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors 
      });
    }

    res.status(500).json({ 
      message: 'Server error during registration' 
    });
  }
});

//  LOGIN - Authenticate user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful!',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login' 
    });
  }
});

//  GET CURRENT USER
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: 'Server error fetching profile' 
    });
  }
});

//  UPDATE PROFILE
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    const updates = {};
    if (firstName) updates.firstName = firstName.trim();
    if (lastName) updates.lastName = lastName.trim();
    if (phone) updates.phone = phone.trim();

    const user = await User.findByIdAndUpdate(
      req.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully!',
      user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Server error updating profile' 
    });
  }
});

//  CHANGE PASSWORD
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'New password must be at least 8 characters' 
      });
    }

    const user = await User.findById(req.userId);
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ 
        message: 'Current password is incorrect' 
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully!'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      message: 'Server error changing password' 
    });
  }
});

//  LOGOUT
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    res.json({ 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Server error during logout' 
    });
  }
});

// =============================================
//  GOOGLE OAUTH AUTHENTICATION
// =============================================

// ✅ GOOGLE LOGIN - Initialize OAuth
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

// ✅ GOOGLE CALLBACK - After Google redirects
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login.html?error=google_failed',
    session: false
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user._id);
      
      // Redirect to frontend with token
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5000';
      res.redirect(
        `${frontendURL}/auth-callback.html?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user.toJSON()))}`
      );
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect('/login.html?error=server_error');
    }
  }
);

// ✅ GOOGLE TOKEN - Alternative flow for frontend
router.post('/google-token', async (req, res) => {
  try {
    const { googleToken } = req.body;
    
    if (!googleToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Google token is required' 
      });
    }

    // Verify Google token
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { email, given_name, family_name, picture, sub: googleId } = payload;
    
    // Find or create user
    let user = await User.findOne({ googleId });
    
    if (!user) {
      // Check if user exists by email (link Google account)
      user = await User.findOne({ email });
      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        user.profilePicture = picture || user.profilePicture;
        await user.save();
      } else {
        // Create new user
        user = new User({
          firstName: given_name || '',
          lastName: family_name || '',
          email: email,
          password: Math.random().toString(36).slice(-16),
          googleId: googleId,
          profilePicture: picture || '',
          emailVerified: true,
          lastLogin: new Date()
        });
        await user.save();
      }
    } else {
      // Update last login
      user.lastLogin = new Date();
      if (picture) user.profilePicture = picture;
      await user.save();
    }
    
    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: user.toJSON()
    });
    
  } catch (error) {
    console.error('Google token error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid Google token' 
    });
  }
});

module.exports = router;