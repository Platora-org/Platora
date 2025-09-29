import express from 'express';
import { fetchCustomerProfile, updateCustomerProfile } from '../controllers/customerProfileController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

const router = express.Router();

router.get('/data', verifyJWT, checkRole('customer'), fetchCustomerProfile);
router.put('/data', verifyJWT, checkRole('customer'), updateCustomerProfile);
// Fetch messages for a specific order (no auth for demo)
router.get('/messages/:orderId', fetchMessages);

// Send a new message (no auth for demo)
router.post('/messages', sendMessage);

router.get('/messages/:orderId', verifyJWT, fetchMessages);
router.post('/messages', verifyJWT, sendMessage);

export default router;
