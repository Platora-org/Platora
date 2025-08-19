import express from 'express';
import passport from 'passport';
import { register, login, logout, me, addDeliveryAgent, deleteDeliveryAgent } from '../controllers/authController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

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

export default router;
