import express from 'express';
import { fetchCustomerProfile, updateCustomerProfile } from '../controllers/customerProfileController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

const router = express.Router();

router.get('/data', verifyJWT, checkRole('customer'), fetchCustomerProfile);
router.put('/data', verifyJWT, checkRole('customer'), updateCustomerProfile);

export default router;
