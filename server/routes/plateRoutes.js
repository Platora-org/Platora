import express from 'express';
import plateController from '../controllers/plateController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

const router = express.Router();

router.get("/", verifyJWT, checkRole('customer'), plateController.getCart);
router.post("/add", verifyJWT, checkRole('customer'), plateController.addToCart);
router.put("/update", verifyJWT, checkRole('customer'), plateController.updateItem);
router.delete("/:cartItemId",  verifyJWT, checkRole('customer'),plateController.removeItem);

export default router;