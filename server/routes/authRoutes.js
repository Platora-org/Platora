import express from 'express';
import passport from 'passport';
import { register, login, logout, me, addDeliveryAgent, deleteDeliveryAgent } from '../controllers/authController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';
import { sendPasswordResetEmail } from "../services/emailService.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import pool from "../config/db.js";

const router = express.Router();

router.post('/register', register);
router.post('/addDeliveryAgent', addDeliveryAgent);
router.post('/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ message: info?.message || 'Login failed' });
    }
    req.user = user;
    login(req, res);
  })(req, res, next);
});

router.get('/deleteDeliveryAgent/:id',verifyJWT, checkRole('admin') , deleteDeliveryAgent);

router.get('/logout', logout);
router.get('/me', verifyJWT, me);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  (req, res, next) => {
    console.log('Redirecting to frontend...');
    login(req, res, true);
  }
);

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // 1️⃣ Find user
    const result = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      // Always return generic message to avoid user enumeration
      return res.json({ message: "If this email exists, a reset link has been sent." });
    }

    const userId = result.rows[0].id;

    // 2️⃣ Create token & expiry
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // 3️⃣ Store token
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [userId, token, expiresAt]
    );

    // 4️⃣ Send email
    const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetLink);

    res.json({ message: "If this email exists, a reset link has been sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /auth/reset-password
 */
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // 1️⃣ Verify token
    const tokenRes = await pool.query(
      "SELECT * FROM password_reset_tokens WHERE token=$1 AND used=false",
      [token]
    );

    if (tokenRes.rows.length === 0)
      return res.status(400).json({ message: "Invalid or expired token." });

    const tokenRow = tokenRes.rows[0];
    if (new Date(tokenRow.expires_at) < new Date()) {
      return res.status(400).json({ message: "Token expired." });
    }

    // 2️⃣ Hash password
    const hashed = await bcrypt.hash(newPassword, 10);

    // 3️⃣ Update user password
    await pool.query("UPDATE users SET password=$1 WHERE id=$2", [hashed, tokenRow.user_id]);

    // 4️⃣ Mark token as used
    await pool.query("UPDATE password_reset_tokens SET used=true WHERE id=$1", [tokenRow.id]);

    res.json({ message: "Password has been reset successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
