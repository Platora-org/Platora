import express from 'express';
import inventoryController from '../controllers/inventoryController.js';

const router = express.Router();

router.get('/', inventoryController.list);
router.post('/', inventoryController.create);
router.get('/:id', inventoryController.getOne);
router.put('/:id', inventoryController.update);
router.delete('/:id', inventoryController.remove);
router.patch('/:id/adjust', inventoryController.adjust);
router.get('/:id/adjustments', inventoryController.listAdjustments);

export default router;
