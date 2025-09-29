import express from 'express';
import inventoryController from '../controllers/inventoryController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

const router = express.Router();

router.get('/adjustments', verifyJWT, checkRole('restaurant'),inventoryController.listAdjustments);
router.get('/adjustments/export', verifyJWT, checkRole('restaurant'), inventoryController.exportAdjustments);
router.get('/',verifyJWT, checkRole('restaurant') , inventoryController.list);
router.post('/',verifyJWT, checkRole('restaurant'), inventoryController.create);
router.get('/:id',verifyJWT, checkRole('restaurant'),  inventoryController.getOne);
router.put('/:id', verifyJWT, checkRole('restaurant'),inventoryController.update);
router.delete('/:id',verifyJWT, checkRole('restaurant'), inventoryController.remove);
router.patch('/:id/adjust', verifyJWT, checkRole('restaurant'),inventoryController.adjust);


export default router;
