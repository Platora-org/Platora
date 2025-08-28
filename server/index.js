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

app.use('/api/restaurant/kyc', kycRoutes);

app.use('/api/audit', auditRoutes);


app.listen(port, () => {
    console.log(`Server running on port ${3000}`);
})

