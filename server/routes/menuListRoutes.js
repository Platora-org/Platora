import express from 'express';
import { fetchMenuList } from '../controllers/menuListController.js';

const router = express.Router();

router.get('/:id', fetchMenuList);

export default router;