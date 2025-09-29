import express from 'express';
import { checkProductionController } from '../controllers/orderController.js';
import { checkoutOrder, getCustomerOrders, cancelRestaurantSuborderController } from '../controllers/orderController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

const router = express.Router();

router.post('/inventoryCheck', verifyJWT, checkRole('customer'), checkProductionController);
router.post('/checkout', verifyJWT, checkRole('customer'), checkoutOrder);
router.get('/my/:customerId', verifyJWT, checkRole('customer'), getCustomerOrders);
router.post('/restaurant-order/:restaurantOrderId/cancel', verifyJWT, checkRole('customer'), cancelRestaurantSuborderController);

export default router;
