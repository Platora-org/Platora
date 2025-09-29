import express from 'express';
import restaurantOrderController from '../controllers/restaurantOrderController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

const router = express.Router();

router.get('/:restaurantOrderId', verifyJWT, checkRole('restaurant'), restaurantOrderController.getOrders);
router.patch('/:restaurantOrderId/status', verifyJWT, checkRole('restaurant'), restaurantOrderController.updateOrderStatusController);
router.patch('/:restaurantOrderId/advance', verifyJWT, checkRole('restaurant'), restaurantOrderController.advanceStatus);

export default router;
