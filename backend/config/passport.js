// ✅ Add this at the top of passport.js
console.log('🔍 Checking Google OAuth Environment Variables:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ MISSING');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ MISSING');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || '❌ MISSING');

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// ✅ Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// ✅ Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// ✅ Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google Profile:', profile);
        
        // Check if user exists by Google ID
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
          user.lastLogin = new Date();
          await user.save();
          return done(null, user);
        }
        
        // Check if user exists by email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findOne({ email: email });
          if (user) {
            user.googleId = profile.id;
            user.profilePicture = profile.photos?.[0]?.value || '';
            user.lastLogin = new Date();
            await user.save();
            return done(null, user);
          }
        }
        
        // Create new user
        const newUser = new User({
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          email: profile.emails?.[0]?.value || '',
          password: Math.random().toString(36).slice(-16),
          googleId: profile.id,
          profilePicture: profile.photos?.[0]?.value || '',
          emailVerified: true,
          lastLogin: new Date()
        });
        
        await newUser.save();
        return done(null, newUser);
        
      } catch (error) {
        console.error('Google Strategy Error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;