import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import {findUserByEmail} from '../models/userModel.js';
import { getRestaurantById } from '../models/restaurantModel.js'; 
import bcrypt from 'bcrypt';
import pool from './db.js';

export function configurePassport(passport) {
  // Local Strategy

passport.use(new LocalStrategy({
  usernameField: 'email'
}, async (email, password, done) => {
  try {
    const user = await findUserByEmail(email);
    if (!user) return done(null, false, { message: 'Invalid email or password.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return done(null, false, { message: 'Invalid email or password.' });

    // If user is a restaurant, load restaurant profile data
    if (user.role === 'restaurant') {
      const restaurantProfile = await getRestaurantById(user.id);
      if (restaurantProfile) {
        // Merge restaurant profile fields into user object
        return done(null, { ...user, restaurantProfile });
      }
    }

    // For customers or other roles, just return user
    return done(null, user);

  } catch (err) {
    return done(err);
  }
}));


  // Google Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1 AND account_status != 'deleted'", [profile.emails[0].value]);
      if (result.rows.length > 0) return done(null, result.rows[0]);

      const insertRes = await pool.query(`
        INSERT INTO users (first_name, last_name, email, provider, role, google_id)
        VALUES ($1, $2, $3, 'google', 'customer', $4)
        RETURNING *`, [
        profile.name.givenName,
        profile.name.familyName,
        profile.emails[0].value,
        profile.id
      ]);
      return done(null, insertRes.rows[0]);
    } catch (err) {
      return done(err);
    }
  }));
}
