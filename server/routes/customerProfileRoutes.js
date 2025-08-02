import express from 'express';
import { fetchCustomerProfile } from '../controllers/customerProfileController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

const router = express.Router();


router.get('/data',verifyJWT, checkRole('customer') ,fetchCustomerProfile);

export default router;