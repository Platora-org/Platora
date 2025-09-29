import express from 'express';
import { recipeController } from '../controllers/recipeController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

const router = express.Router();

// List recipe ingredients for a menu item
router.get('/:menuItemId', verifyJWT, checkRole('restaurant'), recipeController.listRecipe);

// Save/update recipe
router.post('/:menuItemId', verifyJWT, checkRole('restaurant'), recipeController.saveRecipe);

export default router;
