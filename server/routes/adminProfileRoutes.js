import express from 'express';
import { fetchDeliveryAgents } from '../controllers/adminProfileController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

const router = express.Router();


router.get('/deliveryagentdata',verifyJWT, checkRole('admin') , fetchDeliveryAgents);

export default router;