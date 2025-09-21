import express from 'express';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import {configurePassport} from './config/passport.js';
import authRoutes from './routes/authRoutes.js';
import customerProfileRoutes from './routes/customerProfileRoutes.js';
import adminProfileRoutes from './routes/adminProfileRoutes.js'
import kycRoutes from './routes/kycRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import restaurantsListRoutes from './routes/restaurantsListRoutes.js'
import menuListRoutes from './routes/menuListRoutes.js'
import categoryRoutes from './routes/categoriesRoutes.js'
import walletRoutes from './routes/walletRoutes.js';
import cron from 'node-cron';
import * as WalletService from './services/walletService.js';

const app = express();
const port = 3000;

dotenv.config();

app.use(cors({
  origin: 'http://localhost:5173', // React frontend
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: 'sessionsecret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
configurePassport(passport);

app.use('/api/auth', authRoutes);
app.use('/customer/profile', customerProfileRoutes);
app.use('/admin/profile', adminProfileRoutes);
app.use('/restaurants/data', restaurantsListRoutes);
app.use('/restaurants/menu', menuListRoutes);
app.use('/restaurants/menuCategories', categoryRoutes);

app.use('/api/restaurant/kyc', kycRoutes);
app.use('/api/audit', auditRoutes);

app.use('/api/wallet', (req, res, next) => {
  console.log('=== WALLET ROUTE HIT ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Full path:', req.path);
  console.log('Cookies:', req.cookies);
  console.log('========================');
  next();
});

app.use('/api/wallet', walletRoutes);


cron.schedule('0 */4 * * *', async () => {
  console.log('Auto-updating exchange rates from Alpha Vantage...');
  try {
    const result = await WalletService.updateExchangeRates();
    console.log('Exchange rates updated:', result.message);
  } catch (error) {
    console.error('Failed to auto-update rates:', error);
  }
});

console.log('Exchange rate auto-updater scheduled (every 4 hours)');

app.use((req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(port, () => {
    console.log(`Server running on port ${3000}`);
})

