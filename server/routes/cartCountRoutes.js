import express from "express";
import { getCartCount } from "../controllers/cartCountController.js";
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

const router = express.Router();

router.get("/", verifyJWT, checkRole('customer'), getCartCount);

export default router;
