const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${(process.env.FRONTEND_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/auth/google/callback`
      },
      async (access, refresh, profile, done) => {
        try {
          if (!profile._json?.email_verified) return done(null, false);
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) return done(null, false);
          let user = await User.findOne({ googleId: profile.id });
          // An existing password account must authenticate separately; never silently link it.
          if (!user && (await User.exists({ email }))) return done(null, false);
          if (!user)
            user = new User({
              email,
              googleId: profile.id,
              firstName: profile.name?.givenName || 'Guest',
              lastName: profile.name?.familyName || ''
            });
          user.lastLogin = new Date();
          await user.save();
          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
module.exports = passport;
