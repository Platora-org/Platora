import express from 'express';
import { fetchDeliveryAgents, exportUserReport } from '../controllers/adminProfileController.js';
import {  } from "../controllers/adminProfileController.js";
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

const router = express.Router();


router.get('/deliveryagentdata',verifyJWT, checkRole('admin') , fetchDeliveryAgents);
router.get("/users/export",verifyJWT, checkRole('admin'), exportUserReport);

export default router;