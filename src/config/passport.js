'use strict';

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const UserModel = require('../models/User');

/**
 * Configure the Google OAuth 2.0 strategy.
 *
 * Requested scopes:
 *   - openid   : standard OIDC identifier
 *   - profile  : display name, avatar
 *   - email    : verified e-mail address
 *
 * The callback will:
 *  1. Look for an existing account by googleId.
 *  2. If not found, check for an existing account with the same e-mail and
 *     link the Google identity to it (account linking).
 *  3. If still not found, create a brand-new account.
 */
function configurePassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['openid', 'profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email =
            profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const name = profile.displayName || '';
          const avatar =
            profile.photos && profile.photos[0] ? profile.photos[0].value : null;

          if (!email) {
            return done(new Error('Google profile did not include an email address.'));
          }

          // 1. Find by googleId (returning user)
          let user = UserModel.findByGoogleId(googleId);

          if (!user) {
            // 2. Account linking: same e-mail already registered via another method
            const existing = UserModel.findByEmail(email);
            if (existing) {
              user = UserModel.linkGoogleAccount(existing.id, { googleId, avatar });
            } else {
              // 3. New registration
              user = UserModel.createFromGoogle({ googleId, email, name, avatar });
            }
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // Passport session serialisation is not used (stateless JWT), but the
  // methods must be defined when passport is initialised.
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    const user = UserModel.findById(id);
    done(user ? null : new Error('User not found'), user || null);
  });
}

module.exports = { configurePassport };
