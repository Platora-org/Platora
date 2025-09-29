// routes/categories.js
import express from 'express';
const router = express.Router();
import categoriesController from '../controllers/menuCategoriesController.js';
import verifyJWT from '../middleware/verifyToken.js';
import checkRole from '../middleware/requireRole.js';

// GET /api/v1/categories
router.get('/',verifyJWT, checkRole('restaurant') , categoriesController.getCategories);

// POST /api/v1/categories
router.post('/',verifyJWT, checkRole('restaurant') , categoriesController.createCategory);

// PUT /api/v1/categories/:id
router.put('/:id',verifyJWT, checkRole('restaurant') , categoriesController.updateCategory);

// DELETE /api/v1/categories/:id
router.delete('/:id',verifyJWT, checkRole('restaurant') , categoriesController.deleteCategory);

export default router;
